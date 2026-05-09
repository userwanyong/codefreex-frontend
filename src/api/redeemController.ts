import request from '@/request'

/** 管理员生成兑换码 */
export async function generateRedeem(params: {
  quota: number
  batch?: string
  expireHours?: number
  maxUseCount?: number
}) {
  return request<API.BaseResponse<API.Redeem>>('/redeem/generate', {
    method: 'POST',
    params,
  })
}

/** 使用兑换码 */
export async function useRedeem(redeemCode: string) {
  return request<API.BaseResponse<boolean>>('/redeem/use', {
    method: 'POST',
    params: { redeemCode },
  })
}

/** 管理员获取兑换码列表 */
export async function getRedeemList(params: {
  pageNum?: number
  pageSize?: number
  status?: string
}) {
  return request<API.BaseResponse<API.PageResponse<API.Redeem>>>('/redeem/list', {
    method: 'GET',
    params,
  })
}

/** 管理员获取兑换码详情 */
export async function getRedeem(redeemId: string) {
  return request<API.BaseResponse<API.Redeem>>(`/redeem/${redeemId}`, {
    method: 'GET',
  })
}

/** 管理员获取兑换码使用用户列表 */
export async function getRedeemUsers(redeemId: string) {
  return request<API.BaseResponse<API.RedeemUser[]>>(`/redeem/${redeemId}/users`, {
    method: 'GET',
  })
}
