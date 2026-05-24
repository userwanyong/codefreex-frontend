import type { VercelRequest, VercelResponse } from '@vercel/node'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8123'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = req.query.path
  const pathString = Array.isArray(path) ? path.join('/') : path || ''

  const url = new URL(`/api/${pathString}`, BACKEND_URL)
  if (req.url) {
    const params = new URL(req.url, 'http://dummy').searchParams
    params.forEach((value, key) => url.searchParams.set(key, value))
  }

  const headers: Record<string, string> = {}
  if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'] as string
  if (req.headers['authorization']) headers['authorization'] = req.headers['authorization'] as string

  try {
    const response = await fetch(url.toString(), {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    })

    res.status(response.status)
    response.headers.forEach((value, key) => {
      const lower = key.toLowerCase()
      if (lower !== 'transfer-encoding') res.setHeader(key, value)
    })
    res.send(await response.text())
  } catch {
    res.status(502).json({ error: 'Backend unavailable' })
  }
}
