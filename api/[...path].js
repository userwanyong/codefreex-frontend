const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8123'

module.exports = async function handler(req, res) {
  try {
    const path = req.query.path
    const pathString = Array.isArray(path) ? path.join('/') : path || ''

    const url = new URL(`/api/${pathString}`, BACKEND_URL)
    if (req.url) {
      const params = new URL(req.url, 'http://dummy').searchParams
      params.forEach((value, key) => url.searchParams.set(key, value))
    }

    const headers = {}
    if (req.headers['content-type']) headers['content-type'] = req.headers['content-type']
    if (req.headers['authorization']) headers['authorization'] = req.headers['authorization']
    if (req.headers['cookie']) headers['cookie'] = req.headers['cookie']

    const response = await fetch(url.toString(), {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    })

    res.status(response.status)
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'transfer-encoding') {
        res.setHeader(key, value)
      }
    })
    res.send(await response.text())
  } catch (err) {
    console.error('Proxy error:', err)
    res.status(502).json({ error: 'Backend unavailable' })
  }
}
