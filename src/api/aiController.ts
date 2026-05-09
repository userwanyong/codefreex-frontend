import request from '@/request'
import { createSSEConnection } from '@/utils/sse'

/** 预审核提示词 */
export async function reviewPrompt(prompt: string) {
  return request<API.BaseResponse<{ safe?: boolean; reason?: string; route?: string }>>(
    '/ai/prompt/review',
    { method: 'POST', data: { prompt } },
  )
}

/** AI 优化提示词 */
export async function optimizePrompt(prompt: string) {
  return request<API.BaseResponse<string>>('/ai/prompt/optimize', {
    method: 'POST',
    data: { prompt },
  })
}

/** SSE 流式对话生成代码 */
export function streamChatGenCode(
  appId: string,
  message: string,
  callbacks: {
    onMessage: (event: { type?: string; data?: unknown }) => void
    onDone: () => void
    onError: (error: unknown) => void
  },
) {
  return createSSEConnection(
    '/api/ai/chat/gen/code',
    { appId, message },
    callbacks,
  )
}
