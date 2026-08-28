// 禁用 Vercel body 解析，直接转发原始字节流
export const config = {
  api: { bodyParser: false },
}

export default async function handler(req, res) {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:18123'
  const targetUrl = `${backendUrl}${req.url}`

  try {
    const headers = {}
    for (const [key, value] of Object.entries(req.headers)) {
      if (key.toLowerCase() !== 'host') {
        headers[key] = Array.isArray(value) ? value[0] : value || ''
      }
    }

    // 读取原始 body（支持 JSON / form-urlencoded / multipart / binary）
    let rawBody = undefined
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks = []
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
      }
      if (chunks.length) rawBody = Buffer.concat(chunks)
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: rawBody,
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

    const buf = Buffer.from(await response.arrayBuffer())
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'transfer-encoding' && key.toLowerCase() !== 'content-length') {
        res.setHeader(key, value)
      }
    })
    res.setHeader('Content-Length', buf.length)
    res.status(response.status).end(buf)
  } catch (error) {
    console.error('Proxy error:', error)
    res.status(502).json({ error: true, message: error.message })
  }
}
