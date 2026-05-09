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
    if (value === undefined || value === null) {
      return
    }
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
  const eventSource = new EventSource(fullUrl, { withCredentials: true })

  eventSource.onmessage = (event) => {
    if (event.data === '[DONE]') {
      callbacks.onDone()
      eventSource.close()
      return
    }

    try {
      const parsed = JSON.parse(event.data) as SSEMessageEvent
      callbacks.onMessage({ ...parsed, raw: event.data })
    } catch {
      callbacks.onMessage({ raw: event.data })
    }
  }

  eventSource.onerror = (error) => {
    callbacks.onError(error)
    eventSource.close()
  }

  return eventSource
}
