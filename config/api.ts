export const apiConfig = {
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  proxyTarget: 'http://localhost:8123',
  timeout: 60_000,
} as const

