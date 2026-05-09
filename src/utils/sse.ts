export type SSEMessageEvent = {
  type?: string
  data?: unknown
  raw?: string
}

type SSECallbacks = {
  onMessage: (event: SSEMessageEvent) => void
  onDone: () => void
  onError: (error: unknown) => void
}

function buildQuery(params: Record<string, unknown>) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    search.set(key, typeof value === 'string' ? value : JSON.stringify(value))
  })
  return search.toString()
}

export function createSSEConnection(
  url: string,
  params: Record<string, unknown>,
  callbacks: SSECallbacks,
) {
  const query = buildQuery(params)
  const fullUrl = query ? `${url}?${query}` : url

  console.log('[SSE] Connecting to:', fullUrl)

  const eventSource = new EventSource(fullUrl, { withCredentials: true })

  eventSource.onmessage = (event) => {
    // 后端发送 [DONE] 原始信号
    if (event.data === '[DONE]') {
      console.log('[SSE] Received [DONE]')
      callbacks.onDone()
      eventSource.close()
      return
    }

    try {
      const parsed = JSON.parse(event.data) as SSEMessageEvent
      // 后端 done 事件：{"type":"done","data":""}
      if (parsed.type === 'done') {
        console.log('[SSE] Received done event')
        callbacks.onDone()
        eventSource.close()
        return
      }
      // 后端 error 事件：{"type":"error","data":"..."}
      if (parsed.type === 'error') {
        console.error('[SSE] Server error:', parsed.data)
        callbacks.onError(parsed.data)
        eventSource.close()
        return
      }
      console.log('[SSE] Message:', parsed.type, String(parsed.data || '').slice(0, 80))
      callbacks.onMessage({ ...parsed, raw: event.data })
    } catch {
      console.log('[SSE] Raw message:', event.data.slice(0, 100))
      callbacks.onMessage({ raw: event.data })
    }
  }

  eventSource.onerror = (error) => {
    console.error('[SSE] Error:', error, 'readyState:', eventSource.readyState)
    // 无论什么状态都关闭，防止浏览器自动重连导致循环请求
    callbacks.onError(error)
    eventSource.close()
  }

  return eventSource
}
