import request from '@/request'
import { createSSEConnection, createPostSSEConnection, createGetSSEConnection } from '@/utils/sse'

/** 获取应用聊天历史 */
export async function getChatHistory(appId: string, cursor?: string) {
  return request<API.BaseResponse<{ records?: API.ChatHistoryItem[]; nextCursor?: string; hasNext?: boolean }>>('/chat/history/list', {
    method: 'GET',
    params: { appId, cursor: cursor || undefined },
  })
}

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

/** SSE 流式工作流生成代码 (POST) */
export function streamWorkflowGenerate(
  appId: string,
  message: string,
  callbacks: {
    onMessage: (event: API.WorkflowEvent) => void
    onDone: () => void
    onError: (error: unknown) => void
  },
): AbortController {
  return createPostSSEConnection(
    '/ai/workflow/generate',
    { appId, message },
    {
      onMessage(event) {
        callbacks.onMessage(event as API.WorkflowEvent)
      },
      onDone: callbacks.onDone,
      onError: callbacks.onError,
    },
  )
}

/** 查询工作流状态 */
export async function getWorkflowStatus(appId: string) {
  return request<API.BaseResponse<API.WorkflowStatusResponse>>('/ai/workflow/status', {
    method: 'GET',
    params: { appId },
  })
}

/** SSE 断线重连（GET方式，回放缓存事件 + 实时订阅） */
export function reconnectWorkflow(
  appId: string,
  callbacks: {
    onMessage: (event: API.WorkflowEvent) => void
    onDone: () => void
    onError: (error: unknown) => void
  },
): AbortController {
  return createGetSSEConnection(
    '/ai/workflow/reconnect',
    { appId },
    {
      onMessage(event) {
        callbacks.onMessage(event as API.WorkflowEvent)
      },
      onDone: callbacks.onDone,
      onError: callbacks.onError,
    },
  )
}

