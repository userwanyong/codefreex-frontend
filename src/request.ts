import axios from 'axios'
import { message } from 'ant-design-vue'
import { apiConfig } from '../config/api'

const myAxios = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  withCredentials: true,
})

// 请求拦截器：注入 Token
myAxios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('codefreex_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// 响应拦截器：处理未登录
myAxios.interceptors.response.use(
  (response) => {
    const { data } = response
    if (data.code === 40100) {
      if (
        !window.location.pathname.includes('/user/login') &&
        !window.location.pathname.includes('/login')
      ) {
        message.warning('请先登录')
        localStorage.removeItem('codefreex_token')
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`
      }
    }
    // 40101 无权限错误由各组件自行处理，避免重复弹窗
    return response
  },
  (error) => {
    message.error(error?.response?.data?.message || error.message || '请求失败，请稍后重试')
    return Promise.reject(error)
  },
)

export default myAxios
