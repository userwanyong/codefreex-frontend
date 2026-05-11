export type SSEMessageEvent = {
  type?: string
  data?: unknown
  raw?: string
}

export type SSECallbacks = {
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
    if (event.data === '[DONE]') {
      console.log('[SSE] Received [DONE]')
      callbacks.onDone()
      eventSource.close()
      return
    }

    try {
      const parsed = JSON.parse(event.data) as SSEMessageEvent
      if (parsed.type === 'done') {
        console.log('[SSE] Received done event')
        callbacks.onDone()
        eventSource.close()
        return
      }
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
    callbacks.onError(error)
    eventSource.close()
  }

  return eventSource
}

/**
 * POST 方式的 SSE 连接（fetch + ReadableStream）
 * 用于 POST /ai/workflow/generate 等需要 POST body 的流式接口
 */
export function createPostSSEConnection(
  url: string,
  body: Record<string, unknown>,
  callbacks: SSECallbacks,
): AbortController {
  const controller = new AbortController()
  const token = localStorage.getItem('codefreex_token')
  const fullUrl = `/api${url}`

  console.log('[SSE-POST] Connecting to:', fullUrl)

  // 解析单个 SSE 帧，返回 true 表示流应终止
  function processFrame(raw: string): boolean | undefined {
    if (!raw.trim()) return undefined
    if (raw === '[DONE]') {
      console.log('[SSE-POST] Received [DONE]')
      callbacks.onDone()
      return true
    }
    try {
      const parsed = JSON.parse(raw) as SSEMessageEvent
      if (parsed.type === 'done') {
        console.log('[SSE-POST] Received done event')
        callbacks.onDone()
        return true
      }
      if (parsed.type === 'error') {
        console.error('[SSE-POST] Server error:', parsed.data)
        callbacks.onError(parsed.data)
        return true
      }
      console.log('[SSE-POST] Message:', parsed.type, String(parsed.data || '').slice(0, 80))
      callbacks.onMessage({ ...parsed, raw })
      // 对节点事件返回类型标记，用于外层加延迟
      if (parsed.type === 'tool_request' || parsed.type === 'tool_executed') {
        return 'delay' as unknown as boolean
      }
    } catch {
      console.log('[SSE-POST] Raw message:', raw.slice(0, 100))
      callbacks.onMessage({ raw })
    }
    return false
  }

  function extractDataLine(frame: string): string | null {
    const dataLine = frame.split('\n').find((l) => l.startsWith('data:'))
    return dataLine ? dataLine.slice(5).trim() : null
  }

  fetch(fullUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('codefreex_token')
          window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`
          return
        }
        const text = await response.text().catch(() => '')
        callbacks.onError(text || `HTTP ${response.status}`)
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        callbacks.onError('No readable stream')
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const frames = buffer.split('\n\n')
        buffer = frames.pop() || ''

        for (const frame of frames) {
          const raw = extractDataLine(frame)
          if (raw === null) continue

          const result = processFrame(raw)
          if (result === true) return
          // 节点事件加微小延迟，让浏览器渲染
          if (result === 'delay' as unknown as boolean) {
            await new Promise<void>((r) => setTimeout(r, 30))
          }
        }
      }

      // 流结束但未收到 done 信号，处理剩余 buffer
      if (buffer.trim()) {
        const raw = extractDataLine(buffer)
        if (raw && raw !== '[DONE]') {
          try {
            const parsed = JSON.parse(raw) as SSEMessageEvent
            if (parsed.type !== 'done') {
              callbacks.onMessage({ ...parsed, raw })
            }
          } catch { /* ignore */ }
        }
      }
      callbacks.onDone()
    })
    .catch((err) => {
      if (err.name === 'AbortError') return
      console.error('[SSE-POST] Error:', err)
      callbacks.onError(err)
    })

  return controller
}
