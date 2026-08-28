import request from '@/request'

/** 查询当前开放的登录方式（管理端开闭实时同步），如 ['password', 'email:smtp', 'oauth:gitee'] */
export async function getLoginMethods() {
  return request<API.BaseResponse<string[]>>('/auth/login/methods', {
    method: 'GET',
  })
}

/** 账号密码登录（用户名或邮箱） */
export async function loginByPassword(username: string, password: string) {
  return request<API.BaseResponse<API.TokenResponse>>('/auth/login/password', {
    method: 'POST',
    data: { username, password },
  })
}

/** 发送登录验证码（邮箱/短信） */
export async function sendLoginCode(method: string, target: string) {
  return request<API.BaseResponse<boolean>>('/auth/send-code', {
    method: 'POST',
    data: { method, target },
  })
}

/** 验证码登录（新用户自动注册，需邀请码） */
export async function loginByCode(body: {
  method: string
  target: string
  code: string
  inviteCode?: string
}) {
  return request<API.BaseResponse<API.TokenResponse>>('/auth/login/code', {
    method: 'POST',
    data: body,
  })
}

/** 邮箱注册（密码 + 邀请码） */
export async function register(body: { email: string; password: string; inviteCode: string }) {
  return request<API.BaseResponse<API.TokenResponse>>('/auth/register', {
    method: 'POST',
    data: body,
  })
}

/** 获取 OAuth 授权页地址（跳转发起授权） */
export async function getOAuthAuthorizeUrl(provider: string) {
  return request<API.BaseResponse<string>>(`/auth/oauth/${provider}/authorize`, {
    method: 'GET',
  })
}

/** OAuth 新用户补全注册（提交邀请码） */
export async function completeOAuthRegistration(tempToken: string, inviteCode: string) {
  return request<API.BaseResponse<API.TokenResponse>>('/auth/oauth/complete', {
    method: 'POST',
    data: { tempToken, inviteCode },
  })
}

/** 刷新令牌（轮换返回新令牌对） */
export async function refreshToken(refreshToken: string) {
  return request<API.BaseResponse<API.TokenResponse>>('/auth/refresh', {
    method: 'POST',
    headers: { 'X-Refresh-Token': refreshToken },
  })
}

/** 登出 */
export async function logout(refreshToken?: string) {
  return request<API.BaseResponse<boolean>>('/auth/logout', {
    method: 'POST',
    headers: refreshToken ? { 'X-Refresh-Token': refreshToken } : undefined,
  })
}

/** 获取当前登录用户信息 */
export async function getLoginUserContext() {
  return request<API.BaseResponse<API.LoginUserContext>>('/auth/user/info', {
    method: 'GET',
  })
}
