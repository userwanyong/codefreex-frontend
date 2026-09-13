import request from '@/request'

/** 查询当前生效公告（匿名可访问；登录用户已确认不再弹出时返回空） */
export async function getActiveAnnouncement() {
  return request<API.BaseResponse<API.Announcement>>('/announcement/active', {
    method: 'GET',
  })
}

/** 确认公告（不再弹出） */
export async function ackAnnouncement(announcementId: string | number) {
  return request<API.BaseResponse<boolean>>(`/announcement/${announcementId}/ack`, {
    method: 'POST',
  })
}

/** 分页查询公告列表（管理员） */
export async function adminListAnnouncements(pageNum = 1, pageSize = 10) {
  return request<API.BaseResponse<API.PageResponse<API.Announcement>>>('/announcement/admin/list', {
    method: 'GET',
    params: { pageNum, pageSize },
  })
}

/** 创建公告（管理员） */
export async function adminCreateAnnouncement(data: { title: string; content?: string; status?: string }) {
  return request<API.BaseResponse<API.Announcement>>('/announcement/admin/create', {
    method: 'POST',
    data,
  })
}

/** 更新公告（管理员） */
export async function adminUpdateAnnouncement(data: { id: string | number; title: string; content?: string; status?: string }) {
  return request<API.BaseResponse<boolean>>('/announcement/admin/update', {
    method: 'POST',
    data,
  })
}

/** 删除公告（管理员） */
export async function adminDeleteAnnouncement(announcementId: string | number) {
  return request<API.BaseResponse<boolean>>('/announcement/admin/delete', {
    method: 'POST',
    params: { announcementId },
  })
}
