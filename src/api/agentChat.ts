/** 本地 Node 服务上的 LangGraph Agent（工具 + 情绪花园），经 Vite 代理 `/api/local-agent` */

import { parseApiErrorBody } from '@/utils/parseApiErrorBody'

export type ClientGeoPayload = {
  latitude?: number
  longitude?: number
  city?: string
}

function agentStreamUrl(): string {
  const custom = import.meta.env.VITE_LOCAL_AGENT_STREAM_URL?.trim()
  if (custom) return custom
  return '/api/local-agent/stream'
}

function agentEmotionBaseUrl(): string {
  return import.meta.env.VITE_LOCAL_AGENT_BASE?.trim() || '/api/local-agent'
}

function extractAgentChunkContent(raw: string): string {
  try {
    const j = JSON.parse(raw) as { content?: unknown }
    return typeof j.content === 'string' ? j.content : ''
  } catch {
    return ''
  }
}

/**
 * 尝试获取浏览器经纬度（静默失败）；超时约 3s，避免阻塞发送。
 */
export function tryGetClientGeo(): Promise<ClientGeoPayload | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null)
      return
    }
    const timer = window.setTimeout(() => resolve(null), 3500)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.clearTimeout(timer)
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        })
      },
      () => {
        window.clearTimeout(timer)
        resolve(null)
      },
      { enableHighAccuracy: false, timeout: 3000, maximumAge: 600_000 },
    )
  })
}

export async function streamLocalAgentChat(
  params: { sessionId: string; userMessage: string; geo?: ClientGeoPayload | null },
  onChunk: (delta: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const url = agentStreamUrl()
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({
      sessionId: params.sessionId,
      userMessage: params.userMessage,
      ...(params.geo ? { geo: params.geo } : {}),
    }),
    signal,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(parseApiErrorBody(text) || `Agent 请求失败 (${res.status})`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('无法读取流式响应')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const t = line.trim()
      if (!t.startsWith('data:')) continue
      const raw = t.slice(5).trim()
      if (!raw || raw === '[DONE]') continue
      const piece = extractAgentChunkContent(raw)
      if (piece) onChunk(piece)
    }
  }
  if (buffer.trim()) {
    const t = buffer.trim()
    if (t.startsWith('data:')) {
      const raw = t.slice(5).trim()
      if (raw && raw !== '[DONE]') {
        const piece = extractAgentChunkContent(raw)
        if (piece) onChunk(piece)
      }
    }
  }
}

export async function fetchLocalAgentEmotion(sessionId: string): Promise<Record<string, unknown>> {
  const base = agentEmotionBaseUrl().replace(/\/$/, '')
  const res = await fetch(`${base}/session/${encodeURIComponent(sessionId)}/emotion`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(parseApiErrorBody(text) || `情绪数据请求失败 (${res.status})`)
  }
  return (await res.json()) as Record<string, unknown>
}
