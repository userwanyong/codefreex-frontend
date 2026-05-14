import request from '@/request'

/**
 * 管理员分页查询用量统计
 */
export async function listUsageStats(params: {
  pageNum?: number
  pageSize?: number
  userId?: string
  appId?: string
  modelId?: string
  status?: string
}) {
  return request<API.BaseResponse<API.PageResponse<API.UserUsage>>>('/usage/admin/list', {
    method: 'GET',
    params,
  })
}
