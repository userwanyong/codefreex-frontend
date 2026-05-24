export default async function handler(req, res) {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8123'
  const targetUrl = `${backendUrl}${req.url}`

  try {
    const headers = {}
    for (const [key, value] of Object.entries(req.headers)) {
      if (key.toLowerCase() !== 'host' && key.toLowerCase() !== 'content-length') {
        headers[key] = Array.isArray(value) ? value[0] : value || ''
      }
    }

    // 根据请求类型正确序列化 body
    let body = undefined
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      const ct = (req.headers['content-type'] || '').toLowerCase()
      if (typeof req.body === 'string') {
        body = req.body
      } else if (ct.includes('application/json')) {
        body = JSON.stringify(req.body)
      } else if (ct.includes('application/x-www-form-urlencoded')) {
        body = new URLSearchParams(req.body).toString()
      } else {
        body = JSON.stringify(req.body)
      }
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      redirect: 'manual',
    })

    const contentType = response.headers.get('content-type') || ''
    const isStream = contentType.includes('text/event-stream') || contentType.includes('application/x-ndjson')

    res.setHeader('Content-Type', contentType)
    res.setHeader('Access-Control-Allow-Origin', '*')

    if (isStream) {
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      const reader = response.body?.getReader()
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          res.write(Buffer.from(value))
        }
      }
      res.end()
      return
    }

    const data = await response.text()
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'transfer-encoding') {
        res.setHeader(key, value)
      }
    })
    res.status(response.status).send(data)
  } catch (error) {
    console.error('Proxy error:', error)
    res.status(502).json({ error: true, message: error.message })
  }
}
