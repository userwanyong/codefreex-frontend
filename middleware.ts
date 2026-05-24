export async function middleware(request: Request) {
  const url = new URL(request.url)
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8123'
  const targetUrl = backendUrl + url.pathname + url.search

  const headers = new Headers(request.headers)
  headers.set('host', new URL(backendUrl).host)

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
  })

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
}

export const config = {
  matcher: '/api/:path*',
}
