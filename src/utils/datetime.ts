/**
 * 统一时间展示工具：全站时间一律渲染为 2026-09-13 19:32:13 形式。
 */

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * 格式化为 2026-09-13 19:32:13；空值返回 '-'，非法值原样返回
 */
export function formatDateTime(input?: string | number | Date | null): string {
  if (input === null || input === undefined || input === '') return '-'
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return String(input)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
    + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
