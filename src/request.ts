import axios from 'axios'
import { message } from 'ant-design-vue'
import { apiConfig } from '../config/api'

const TOKEN_KEY = 'codefreex_token'
const REFRESH_TOKEN_KEY = 'codefreex_refresh_token'

const myAxios = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  withCredentials: true,
})

// 请求拦截器：注入 Token
myAxios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// 单飞刷新：并发多个 40100 时只发起一次刷新请求
let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY)
      if (!storedRefresh) {
        return null
      }
      try {
        const res = await axios.post(
          `${apiConfig.baseURL}/auth/refresh`,
          null,
          { headers: { 'X-Refresh-Token': storedRefresh } },
        )
        const body = res.data
        if (body?.code === 0 && body.data) {
          const tokenData: API.TokenResponse =
            typeof body.data === 'string' ? JSON.parse(body.data) : body.data
          if (tokenData.accessToken) {
            localStorage.setItem(TOKEN_KEY, tokenData.accessToken)
            if (tokenData.refreshToken) {
              localStorage.setItem(REFRESH_TOKEN_KEY, tokenData.refreshToken)
            }
            return tokenData.accessToken
          }
        }
        return null
      } catch {
        return null
      } finally {
        refreshPromise = null
      }
    })()
  }
  return refreshPromise
}

function redirectToLogin() {
  if (
    !window.location.pathname.includes('/user/login') &&
    !window.location.pathname.includes('/login')
  ) {
    message.warning('请先登录')
  }
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`
}

// 响应拦截器：令牌过期自动刷新重试；未登录跳转登录页
myAxios.interceptors.response.use(
  async (response) => {
    const { data, config } = response

    if (data?.code === 40100) {
      const isRefreshCall = (config.url || '').includes('/auth/refresh')
      const hasRefreshToken = !!localStorage.getItem(REFRESH_TOKEN_KEY)
      // @ts-expect-error 内部标记：防止同一请求重复刷新重试
      if (!config._retried && hasRefreshToken && !isRefreshCall) {
        // @ts-expect-error 内部标记
        config._retried = true
        const newToken = await refreshAccessToken()
        if (newToken) {
          config.headers.Authorization = `Bearer ${newToken}`
          return myAxios.request(config)
        }
      }
      redirectToLogin()
    }
    // 40101 无权限错误由各组件自行处理，避免重复弹窗
    // 42900 限流错误由各组件自行处理（SSE 场景通过 429 状态码处理）
    if (data.code === 42900) {
      message.warning(data.message || '请求过于频繁，请稍后重试')
    }
    return response
  },
  (error) => {
    message.error(error?.response?.data?.message || error.message || '请求失败，请稍后重试')
    return Promise.reject(error)
  },
)

export default myAxios
