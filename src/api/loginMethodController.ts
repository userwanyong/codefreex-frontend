import request from '@/request'

/** 查询本租户可配置的登录方式 */
export async function listLoginMethodConfigs() {
  return request<API.BaseResponse<API.LoginMethodConfigVO[]>>('/auth/admin/login-methods/list', {
    method: 'GET',
  })
}

/** 保存登录方式开关与凭证来源 */
export async function saveLoginMethodConfig(data: API.LoginMethodSaveRequest) {
  return request<API.BaseResponse<boolean>>('/auth/admin/login-methods/save', {
    method: 'POST',
    data,
  })
}
