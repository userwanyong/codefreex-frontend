import request from '@/request'

/** 生成邀请码 */
export async function generateInvite(params: {
  batch?: string
  expireHours?: number
  maxUseCount?: number
}) {
  return request<API.BaseResponse<API.Invite>>('/invite/generate', {
    method: 'POST',
    params,
  })
}

/** 使用邀请码 */
export async function useInvite(inviteCode: string) {
  return request<API.BaseResponse<boolean>>('/invite/use', {
    method: 'POST',
    params: { inviteCode },
  })
}

/** 获取我的邀请码列表 */
export async function getMyInvites(pageNum = 1, pageSize = 10) {
  return request<API.BaseResponse<API.PageResponse<API.Invite>>>('/invite/list', {
    method: 'GET',
    params: { pageNum, pageSize },
  })
}

/** 获取我的邀请人 */
export async function getMyInviter() {
  return request<API.BaseResponse<API.InviteUser>>('/invite/inviter', {
    method: 'GET',
  })
}

/** 获取邀请码使用用户列表 */
export async function getInviteUsers(inviteId: string) {
  return request<API.BaseResponse<API.InviteUser[]>>(`/invite/${inviteId}/users`, {
    method: 'GET',
  })
}

/** 管理员获取邀请码列表 */
export async function getAdminInvites(params: {
  pageNum?: number
  pageSize?: number
  status?: string
}) {
  return request<API.BaseResponse<API.PageResponse<API.Invite>>>('/invite/admin/list', {
    method: 'GET',
    params,
  })
}
