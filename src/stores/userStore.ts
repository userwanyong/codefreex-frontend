import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { getLoginUserContext } from '@/api/authController'
import { getUserInfo, getUserRoles } from '@/api/userController'
import { parseResponseData } from '@/utils/response'

const TOKEN_KEY = 'codefreex_token'
const REFRESH_TOKEN_KEY = 'codefreex_refresh_token'

export const useUserStore = defineStore('user', () => {
  const loginUser = ref<API.LoginUserContext | null>(null)
  const userInfo = ref<API.UserInfo | null>(null)
  const token = ref<string>(localStorage.getItem(TOKEN_KEY) || '')
  const refreshToken = ref<string>(localStorage.getItem(REFRESH_TOKEN_KEY) || '')
  const roles = ref<string[]>([])
  const isInitialized = ref(false)

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(
    () => roles.value.includes('ROLE_ADMIN') || roles.value.includes('ROLE_PLATFORM_ADMIN'),
  )
  const nickname = computed(() => loginUser.value?.nickname || loginUser.value?.username || '')
  const avatar = computed(() => loginUser.value?.avatar || '')

  function setTokens(accessToken: string, newRefreshToken?: string) {
    token.value = accessToken
    localStorage.setItem(TOKEN_KEY, accessToken)
    if (newRefreshToken) {
      refreshToken.value = newRefreshToken
      localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken)
    }
  }

  function setRefreshToken(newRefreshToken: string) {
    refreshToken.value = newRefreshToken
    localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken)
  }

  function clearAuth() {
    token.value = ''
    refreshToken.value = ''
    loginUser.value = null
    userInfo.value = null
    roles.value = []
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }

  async function fetchLoginUser() {
    try {
      const res = await getLoginUserContext()
      if (res.data?.code === 0 && res.data.data) {
        loginUser.value = parseResponseData<API.LoginUserContext>(res.data.data)
      }
    } catch {
      // ignore
    }
  }

  async function fetchUserRoles() {
    try {
      const res = await getUserRoles()
      if (res.data?.code === 0 && res.data.data) {
        roles.value = parseResponseData<string[]>(res.data.data)
      }
    } catch {
      // ignore
    }
  }

  async function fetchUserInfo() {
    try {
      const res = await getUserInfo()
      if (res.data?.code === 0 && res.data.data) {
        userInfo.value = parseResponseData<API.UserInfo>(res.data.data)
      }
    } catch {
      // ignore
    }
  }

  /** 登录/注册成功后落地令牌并拉取用户数据 */
  async function applyLogin(tokenData: API.TokenResponse) {
    setTokens(tokenData.accessToken || '', tokenData.refreshToken)
    await Promise.all([fetchLoginUser(), fetchUserRoles(), fetchUserInfo()])
  }

  async function initUser() {
    if (!token.value) {
      isInitialized.value = true
      return
    }
    try {
      await Promise.all([fetchLoginUser(), fetchUserRoles(), fetchUserInfo()])
      if (!loginUser.value) {
        clearAuth()
      }
    } catch {
      clearAuth()
    } finally {
      isInitialized.value = true
    }
  }

  async function logout() {
    try {
      const { logout: apiLogout } = await import('@/api/authController')
      await apiLogout(refreshToken.value || undefined)
    } catch {
      // ignore
    }
    clearAuth()
  }

  return {
    loginUser,
    userInfo,
    token,
    refreshToken,
    roles,
    isInitialized,
    isLoggedIn,
    isAdmin,
    nickname,
    avatar,
    setTokens,
    setRefreshToken,
    clearAuth,
    fetchLoginUser,
    fetchUserRoles,
    fetchUserInfo,
    applyLogin,
    initUser,
    logout,
  }
})
