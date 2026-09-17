import request from '@/request'

/** 获取个人中心信息（身份来自 auth-service，码点来自本地） */
export async function getUserInfo() {
  return request<API.BaseResponse<API.UserInfo>>('/user/info', {
    method: 'GET',
  })
}

/** 获取用户角色列表 */
export async function getUserRoles() {
  return request<API.BaseResponse<string[]>>('/user/role', {
    method: 'GET',
  })
}

/** 查询我的码点流水 */
export async function getMyCreditTransactions(pageNum = 1, pageSize = 10) {
  return request<API.BaseResponse<API.PageResponse<API.CreditTransaction>>>('/user/credit-transactions', {
    method: 'GET',
    params: { pageNum, pageSize },
  })
}

/** 更新个人资料（昵称等，写入 auth-service） */
export async function updateProfile(data: { nickname?: string }) {
  return request<API.BaseResponse<boolean>>('/user/profile/update', {
    method: 'POST',
    data,
  })
}

/** 上传头像（经 auth-service 对象存储） */
export async function uploadAvatar(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return request<API.BaseResponse<string>>('/user/avatar/upload', {
    method: 'POST',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/** 修改密码（校验旧密码） */
export async function changePassword(data: { oldPassword: string; newPassword: string }) {
  return request<API.BaseResponse<boolean>>('/user/password/change', {
    method: 'POST',
    data,
  })
}

// ==================== 账号绑定 ====================

/** 查询账号绑定信息（邮箱/手机/第三方） */
export async function getAccountBindings() {
  return request<API.BaseResponse<API.AccountBindings>>('/user/bindings', {
    method: 'GET',
  })
}

/** 发送绑定邮箱的验证码 */
export async function sendEmailBindCode(target: string) {
  return request<API.BaseResponse<boolean>>('/user/bindings/email/send-code', {
    method: 'POST',
    data: { target },
  })
}

/** 绑定/换绑邮箱 */
export async function bindEmail(target: string, code: string) {
  return request<API.BaseResponse<boolean>>('/user/bindings/email', {
    method: 'POST',
    data: { target, code },
  })
}

/** 解绑邮箱 */
export async function unbindEmail() {
  return request<API.BaseResponse<boolean>>('/user/bindings/email/unbind', {
    method: 'POST',
  })
}

/** 发送绑定手机号的验证码 */
export async function sendPhoneBindCode(target: string) {
  return request<API.BaseResponse<boolean>>('/user/bindings/phone/send-code', {
    method: 'POST',
    data: { target },
  })
}

/** 绑定/换绑手机号 */
export async function bindPhone(target: string, code: string) {
  return request<API.BaseResponse<boolean>>('/user/bindings/phone', {
    method: 'POST',
    data: { target, code },
  })
}

/** 解绑手机号 */
export async function unbindPhone() {
  return request<API.BaseResponse<boolean>>('/user/bindings/phone/unbind', {
    method: 'POST',
  })
}

/** 获取第三方账号绑定授权页地址（跳转发起绑定） */
export async function getOAuthBindUrl(provider: string) {
  return request<API.BaseResponse<string>>(`/user/bindings/oauth/${provider}/authorize`, {
    method: 'GET',
  })
}

/** 解绑第三方平台 */
export async function unbindOAuth(provider: string) {
  return request<API.BaseResponse<boolean>>(`/user/bindings/oauth/${provider}/unbind`, {
    method: 'POST',
  })
}

// ==================== 管理员接口（用户管理走 auth-service RPC） ====================

/** 管理员分页查询用户（数据来源 auth-service） */
export async function adminListUsers(params: API.UserQueryRequest) {
  return request<API.BaseResponse<API.PageResponse<API.AdminUserVO>>>('/user/admin/list', {
    method: 'GET',
    params,
  })
}

/** 管理员获取用户详情（含第三方绑定） */
export async function adminGetUserDetail(userId: string) {
  return request<API.BaseResponse<API.AdminUserVO>>(`/user/admin/${userId}`, {
    method: 'GET',
  })
}

/** 管理员创建用户 */
export async function adminCreateUser(data: API.UserAdminCreateRequest) {
  return request<API.BaseResponse<string>>('/user/admin/create', {
    method: 'POST',
    data,
  })
}

/** 管理员编辑用户（null 字段不更新） */
export async function adminUpdateUser(data: API.UserAdminUpdateRequest) {
  return request<API.BaseResponse<boolean>>('/user/admin/update', {
    method: 'POST',
    data,
  })
}

/** 管理员为用户分配角色（全量替换） */
export async function adminAssignUserRoles(userId: string, roleIds: string[]) {
  return request<API.BaseResponse<boolean>>('/user/admin/roles', {
    method: 'POST',
    data: { userId, roleIds },
  })
}

/** 管理员设置用户状态（1-正常，0-禁用） */
export async function adminSetUserStatus(userId: string, status: number) {
  return request<API.BaseResponse<boolean>>('/user/admin/status', {
    method: 'POST',
    params: { userId, status },
  })
}

/** 管理员删除用户 */
export async function adminDeleteUser(userId: string) {
  return request<API.BaseResponse<boolean>>(`/user/admin/${userId}/delete`, {
    method: 'POST',
  })
}

/** 管理员查询用户码点流水 */
export async function adminGetCreditTransactions(userId: string, pageNum = 1, pageSize = 10) {
  return request<API.BaseResponse<API.PageResponse<API.CreditTransaction>>>(`/user/admin/${userId}/credit-transactions`, {
    method: 'GET',
    params: { pageNum, pageSize },
  })
}

/** 管理员分页查询所有码点流水 */
export async function adminListAllCreditTransactions(params: { pageNum?: number; pageSize?: number; userId?: string; type?: string }) {
  return request<API.BaseResponse<API.PageResponse<API.CreditTransaction>>>('/user/admin/credit-transactions', {
    method: 'GET',
    params,
  })
}

/** 管理员调整用户码点 */
export async function adminAdjustCredits(data: API.CreditAdjustRequest) {
  return request<API.BaseResponse<boolean>>('/user/admin/adjust-credits', {
    method: 'POST',
    data,
  })
}
