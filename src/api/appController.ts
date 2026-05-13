import request from '@/request'

/** 创建应用 */
export async function createApp(body: API.AppCreateRequest) {
  return request<API.BaseResponse<API.App>>('/app/create', {
    method: 'POST',
    data: body,
  })
}

/** 编辑应用 */
export async function editApp(body: API.AppEditRequest) {
  return request<API.BaseResponse<boolean>>('/app/edit', {
    method: 'POST',
    data: body,
  })
}

/** 获取应用详情 */
export async function getApp(appId: string) {
  return request<API.BaseResponse<API.AppVO>>(`/app/${appId}`, {
    method: 'GET',
  })
}

/** 删除应用 */
export async function deleteApp(appId: string) {
  return request<API.BaseResponse<boolean>>('/app/delete', {
    method: 'POST',
    params: { appId },
  })
}

/** 获取我的应用列表 */
export async function getMyApps(pageNum = 1, pageSize = 10) {
  return request<API.BaseResponse<API.PageResponse<API.AppVO>>>('/app/my/list', {
    method: 'GET',
    params: { pageNum, pageSize },
  })
}

/** 获取精选应用列表（游标分页） */
export async function getFeaturedApps(cursor?: string, size = 10, tag?: string) {
  return request<API.BaseResponse<API.FeaturedAppResponse>>('/app/featured/list', {
    method: 'GET',
    params: { cursor, size, tag },
  })
}

/** 获取精选应用的所有标签 */
export async function getFeaturedTags() {
  return request<API.BaseResponse<string[]>>('/app/featured/tags', {
    method: 'GET',
  })
}

/** 管理员查询应用列表 */
export async function getAdminApps(params: {
  status?: string
  appName?: string
  pageNum?: number
  pageSize?: number
}) {
  return request<API.BaseResponse<API.PageResponse<API.App>>>('/app/admin/list', {
    method: 'GET',
    params,
  })
}

/** 管理员设置应用精选状态 */
export async function setAppFeatured(appId: string, featured: number) {
  return request<API.BaseResponse<boolean>>('/app/admin/featured', {
    method: 'POST',
    params: { appId, featured },
  })
}

/** 部署应用 */
export async function deployApp(appId: string) {
  return request<API.BaseResponse<API.AppDeployResponse>>('/app/deploy', {
    method: 'POST',
    params: { appId },
  })
}

/** 取消部署 */
export async function cancelDeploy(appId: string) {
  return request<API.BaseResponse<boolean>>('/app/deploy/cancel', {
    method: 'POST',
    params: { appId },
  })
}

/** 下载应用源码 */
export async function downloadApp(appId: string) {
  return request<BlobPart>(`/app/download/${appId}`, {
    method: 'GET',
    responseType: 'blob',
  })
}

/** 获取应用代码内容（从文件系统读取） */
export async function getAppCode(appId: string) {
  return request<API.BaseResponse<string>>(`/app/${appId}/code`, {
    method: 'GET',
  })
}

/** 切换点赞 */
export async function likeApp(appId: string) {
  return request<API.BaseResponse<boolean>>(`/app/${appId}/like`, {
    method: 'POST',
  })
}

/** 查询点赞状态 */
export async function getLikeStatus(appId: string) {
  return request<API.BaseResponse<boolean>>(`/app/${appId}/like/status`, {
    method: 'GET',
  })
}
