import request from '@/request'

/** 获取所有预设标签（公开） */
export async function getAllTags() {
  return request<API.BaseResponse<API.TagVO[]>>('/tag/list', {
    method: 'GET',
  })
}

/** 管理员 - 获取所有标签列表 */
export async function adminListTags() {
  return request<API.BaseResponse<API.TagVO[]>>('/tag/admin/list', {
    method: 'GET',
  })
}

/** 管理员 - 新建标签 */
export async function adminCreateTag(name: string, sortOrder?: number) {
  return request<API.BaseResponse<boolean>>('/tag/admin/create', {
    method: 'POST',
    params: { name, sortOrder },
  })
}

/** 管理员 - 编辑标签 */
export async function adminUpdateTag(id: number, name?: string, sortOrder?: number) {
  return request<API.BaseResponse<boolean>>('/tag/admin/update', {
    method: 'POST',
    params: { id, name, sortOrder },
  })
}

/** 管理员 - 删除标签 */
export async function adminDeleteTag(id: number) {
  return request<API.BaseResponse<boolean>>('/tag/admin/delete', {
    method: 'POST',
    params: { id },
  })
}
