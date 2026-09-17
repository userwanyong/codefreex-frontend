import request from '@/request'

/** 查询全部权限 */
export async function listPermissions() {
  return request<API.BaseResponse<API.PermissionVO[]>>('/permission/admin/list', {
    method: 'GET',
  })
}

/** 创建权限 */
export async function createPermission(data: API.PermissionSaveRequest) {
  return request<API.BaseResponse<string>>('/permission/admin/create', {
    method: 'POST',
    data,
  })
}

/** 删除权限（同时解除角色关联） */
export async function deletePermission(permissionId: string) {
  return request<API.BaseResponse<boolean>>(`/permission/admin/${permissionId}/delete`, {
    method: 'POST',
  })
}
