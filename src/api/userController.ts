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
