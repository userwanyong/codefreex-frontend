import request from '@/request'

/** 查询全部角色（含权限编码） */
export async function listRoles() {
  return request<API.BaseResponse<API.RoleVO[]>>('/role/admin/list', {
    method: 'GET',
  })
}

/** 创建角色 */
export async function createRole(data: API.RoleSaveRequest) {
  return request<API.BaseResponse<string>>('/role/admin/create', {
    method: 'POST',
    data,
  })
}

/** 更新角色（仅名称与描述） */
export async function updateRole(data: API.RoleSaveRequest) {
  return request<API.BaseResponse<boolean>>('/role/admin/update', {
    method: 'POST',
    data,
  })
}

/** 删除角色（内置角色不可删除） */
export async function deleteRole(roleId: string) {
  return request<API.BaseResponse<boolean>>(`/role/admin/${roleId}/delete`, {
    method: 'POST',
  })
}

/** 为角色分配权限（全量替换） */
export async function assignRolePermissions(roleId: string, permissionIds: string[]) {
  return request<API.BaseResponse<boolean>>('/role/admin/permissions', {
    method: 'POST',
    data: { roleId, permissionIds },
  })
}
