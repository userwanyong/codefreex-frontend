import request from '@/request'

/** 获取用户本地信息（积分等） */
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

// ==================== 管理员接口 ====================

/** 管理员分页查询用户 */
export async function adminListUsers(params: API.UserQueryRequest) {
  return request<API.BaseResponse<API.PageResponse<API.UserInfo>>>('/user/admin/list', {
    method: 'GET',
    params,
  })
}

/** 管理员获取用户详情 */
export async function adminGetUserDetail(userId: string) {
  return request<API.BaseResponse<API.AdminUserVO>>(`/user/admin/${userId}`, {
    method: 'GET',
  })
}

/** 管理员设置用户状态 */
export async function adminSetUserStatus(userId: string, status: string) {
  return request<API.BaseResponse<boolean>>('/user/admin/status', {
    method: 'POST',
    params: { userId, status },
  })
}
