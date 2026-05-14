import request from '@/request'

/** 查询通知列表 */
export async function getNotifications(pageNum = 1, pageSize = 10) {
  return request<API.BaseResponse<API.PageResponse<API.Notification>>>('/notification/list', {
    method: 'GET',
    params: { pageNum, pageSize },
  })
}

/** 查询未读通知数量 */
export async function getUnreadCount() {
  return request<API.BaseResponse<number>>('/notification/unread-count', {
    method: 'GET',
  })
}

/** 标记通知为已读 */
export async function markNotificationRead(id: string) {
  return request<API.BaseResponse<boolean>>(`/notification/read/${id}`, {
    method: 'POST',
  })
}

/** 全部标记为已读 */
export async function markAllNotificationsRead() {
  return request<API.BaseResponse<boolean>>('/notification/read-all', {
    method: 'POST',
  })
}
