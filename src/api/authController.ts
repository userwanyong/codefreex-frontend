import request from '@/request'

/** 发送邮箱验证码 */
export async function sendEmailCode(email: string) {
  return request<API.BaseResponse<boolean>>('/auth/email/code', {
    method: 'POST',
    data: { email },
  })
}

/** 邮箱注册 */
export async function register(body: {
  email: string
  emailCode: string
  password: string
  inviteCode: string
}) {
  return request<API.BaseResponse<API.TokenResponse>>('/auth/register', {
    method: 'POST',
    data: body,
  })
}

/** 邮箱登录 */
export async function loginByEmail(email: string, password: string) {
  const body = new URLSearchParams()
  body.set('email', email)
  body.set('password', password)

  return request<API.BaseResponse<API.TokenResponse>>('/auth/login/email', {
    method: 'POST',
    data: body,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })
}

/** 生成微信扫码登录二维码 */
export async function generateWechatQrCode() {
  return request<API.BaseResponse<API.WechatQrCodeResponse>>('/auth/wechat/qrcode/generate', {
    method: 'POST',
  })
}

/** 轮询微信扫码状态 */
export async function pollWechatQrCodeStatus(qrcodeId: string) {
  return request<API.BaseResponse<API.WechatQrCodeResponse>>('/auth/wechat/qrcode/status', {
    method: 'POST',
    data: { qrcodeId },
  })
}

/** 微信扫码登录 */
export async function wechatQrCodeLogin(ticket: string) {
  return request<API.BaseResponse<API.WechatLoginResponse>>('/auth/wechat/qrcode/login', {
    method: 'POST',
    data: { ticket },
  })
}

/** 微信新用户补全注册 */
export async function completeWechatRegistration(tempToken: string, inviteCode: string) {
  return request<API.BaseResponse<API.TokenResponse>>('/auth/wechat/complete', {
    method: 'POST',
    data: { tempToken, inviteCode },
  })
}

/** 登出 */
export async function logout() {
  return request<API.BaseResponse<boolean>>('/auth/logout', {
    method: 'POST',
  })
}

/** 获取当前登录用户信息 */
export async function getLoginUserContext() {
  return request<API.BaseResponse<API.LoginUserContext>>('/auth/user/info', {
    method: 'GET',
  })
}
