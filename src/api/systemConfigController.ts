import request from '@/request'

/** 查询码点计费配置（价格信息，公开） */
export async function getCreditConfig() {
  return request<API.BaseResponse<API.CreditConfig>>('/system-config/credit', {
    method: 'GET',
  })
}

/** 按分组查询全部系统配置（管理员） */
export async function adminListSystemConfigs() {
  return request<API.BaseResponse<API.SystemConfigGroup[]>>('/system-config/admin/list', {
    method: 'GET',
  })
}

/** 批量更新系统配置（管理员） */
export async function adminUpdateSystemConfigs(configs: Record<string, string>) {
  return request<API.BaseResponse<boolean>>('/system-config/admin/update', {
    method: 'POST',
    data: { configs },
  })
}
