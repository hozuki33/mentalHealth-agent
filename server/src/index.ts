
import 'dotenv/config'
import cors from '@fastify/cors'
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify'
import { HumanMessage } from '@langchain/core/messages'
import { ChatOpenAI } from '@langchain/openai'
import { streamReactAgentToSse } from './agentStream.js'
import { type ClientGeo, type EmotionGardenSnapshot, snapshotToEmotionApiBody } from './agentTools.js'
import { sseLine } from './sseLine.js'
import {
  createSessionRecord,
  SqliteSessionStore,
  touchSessionRecord,
  type SessionStore,
} from './memory/sessionStore.js'

const SYSTEM_PROMPT = `你是「小暖」，AI 心理健康陪伴助手。
原则：共情、不评判、不提供诊断或处方；鼓励专业求助；若用户表达自伤/伤人或紧急风险，请明确建议立即联系当地紧急服务或专业人士。
回答简洁、温暖，必要时分点说明。`

/** 会话状态存储：默认 SQLite 持久化，进程重启 / 多次部署不再丢失历史与情绪快照 */
const sessionStore: SessionStore = new SqliteSessionStore()

let sessionSeq = 11600

const sseStreamHeaders = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
} as const

async function pipeAgentSse(
  request: FastifyRequest,
  reply: FastifyReply,
  sessionId: string,
  userText: string,
  geo: ClientGeo,
): Promise<void> {
  const end = () => {
    reply.raw.end()
  }

  if (!userText) {
    reply.raw.write(sseLine({ content: '请输入内容后再发送。' }))
    reply.raw.write(sseLine('[DONE]'))
    end()
    return
  }

  if (!llmApiKey()) {
    reply.raw.write(
      sseLine({
        content: '服务器未配置 DEEPSEEK_API_KEY，请在 server/.env 中设置（或临时使用 OPENAI_API_KEY 兼容名）。',
      }),
    )
    reply.raw.write(sseLine('[DONE]'))
    end()
    return
  }

  try {
    const existing = await sessionStore.get(sessionId)
    const record = existing ?? createSessionRecord(sessionId)
    const history = record.messages

    // agentStream 内部按引用往这个 Map 里写入情绪快照，请求结束后统一落库
    const emotionScratch = new Map<string, EmotionGardenSnapshot>()
    if (record.emotionSnapshot) {
      emotionScratch.set(sessionId, record.emotionSnapshot)
    }

    const llm = buildModel()
    const { assistantText, nextHistory } = await streamReactAgentToSse({
      raw: reply.raw,
      log: request.log,
      llm,
      baseSystem: SYSTEM_PROMPT,
      history,
      userText,
      sessionId,
      geo,
      emotionSnapshots: emotionScratch,
    })

    const updated = touchSessionRecord(record, {
      messages: nextHistory,
      emotionSnapshot: emotionScratch.get(sessionId) ?? record.emotionSnapshot,
    })
    await sessionStore.set(updated)

    if (!assistantText) {
      reply.raw.write(sseLine({ content: '我先陪你待着，你可以再说说此刻的感受吗？' }))
    }
    reply.raw.write(sseLine('[DONE]'))
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    request.log.error(err)
    reply.raw.write(sseLine({ content: `对话服务异常：${message}` }))
    reply.raw.write(sseLine('[DONE]'))
  } finally {
    end()
  }
}

function userHashFromToken(token: string): number {
  if (!token) return 0
  let h = 0
  for (let i = 0; i < token.length; i += 1) {
    h = (Math.imul(31, h) + token.charCodeAt(i)) | 0
  }
  return Math.abs(h) % 900000 + 1000
}

function llmApiKey(): string | undefined {
  return process.env.DEEPSEEK_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim()
}

function llmBaseUrl(): string {
  return (
    process.env.DEEPSEEK_BASE_URL?.trim() ||
    process.env.OPENAI_BASE_URL?.trim() ||
    'https://api.deepseek.com/v1'
  )
    .trim()
    .replace(/\/$/, '')
}

function llmModelName(): string {
  return (
    process.env.DEEPSEEK_BASE_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    'deepseek-chat'
  )
}

function buildModel(): ChatOpenAI {
  return new ChatOpenAI({
    model: llmModelName(),
    apiKey: llmApiKey(),
    temperature: Number(process.env.OPENAI_TEMPERATURE ?? 0.7),
    streaming: true,
    configuration: { baseURL: llmBaseUrl() },
  })
}

const app = Fastify({ logger: true })

await app.register(cors, { origin: true })

app.get('/health', async () => ({ ok: true }))

app.post('/psychological-chat/completion-stream', async (request, reply) => {
  const body = request.body as { messages?: unknown }
  const messages = body?.messages
  if (!Array.isArray(messages) || messages.length === 0) {
    return reply.code(400).send({ message: '缺少 messages' })
  }

  const key = llmApiKey()
  if (!key) {
    return reply.code(503).send({
      message: '服务器未配置 DEEPSEEK_API_KEY，请在 server/.env 中设置。',
    })
  }

  const baseURL = llmBaseUrl()
  const model = llmModelName()

  let upstream: Response
  try {
    upstream = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: Number(process.env.OPENAI_TEMPERATURE ?? 0.7),
      }),
    })
  } catch (err) {
    request.log.error(err)
    return reply.code(502).send({ message: '连接模型服务失败' })
  }

  if (!upstream.ok) {
    const text = await upstream.text()
    return reply.code(upstream.status).send(text)
  }

  reply.raw.writeHead(200, { ...sseStreamHeaders })

  const rb = upstream.body
  if (!rb) {
    reply.raw.end()
    return
  }

  const reader = rb.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value?.byteLength) reply.raw.write(Buffer.from(value))
    }
  } catch (err) {
    request.log.error(err)
  } finally {
    reply.raw.end()
  }
})

app.post('/psychological-chat/session/start', async (request) => {
  const body = request.body as { initialMessage?: string; sessionTitle?: string }
  const initialEcho = String(body?.initialMessage ?? '')
  const initialTrim = initialEcho.trim()
  const sessionTitle = String(body?.sessionTitle ?? '').trim() || '小暖助手'
  const token =
    typeof request.headers.token === 'string'
      ? request.headers.token
      : Array.isArray(request.headers.token)
        ? request.headers.token[0] ?? ''
        : ''

  sessionSeq += 1
  const sessionId = `session_${sessionSeq}`

  const initialMessages = initialTrim ? [new HumanMessage(initialTrim)] : []
  const record = createSessionRecord(sessionId, initialMessages)
  await sessionStore.set(record)

  const messageCount = initialTrim ? 1 : 0

  return {
    code: '200',
    msg: '操作成功',
    data: {
      sessionId,
      userHash: userHashFromToken(token),
      initialMessage: initialEcho,
      startTime: record.createdAt,
      expiryTime: record.expiryTime,
      status: 'ACTIVE' as const,
      messageCount,
    },
  }
})

app.post('/psychological-chat/stream', async (request, reply) => {
  const body = request.body as {
    sessionId?: string | number
    userMessage?: string
    message?: string
    content?: string
  }
  const sessionId = String(body?.sessionId ?? 'anonymous')
  const userText = String(body?.userMessage ?? body?.message ?? body?.content ?? '').trim()

  reply.raw.writeHead(200, sseStreamHeaders)
  await pipeAgentSse(request, reply, sessionId, userText, {})
})

/** 携带 geo 时天气工具可用坐标 */
app.post('/local-agent/stream', async (request, reply) => {
  const body = request.body as {
    sessionId?: string | number
    userMessage?: string
    message?: string
    content?: string
    geo?: { latitude?: unknown; longitude?: unknown; city?: unknown }
  }
  const sessionId = String(body?.sessionId ?? 'anonymous')
  const userText = String(body?.userMessage ?? body?.message ?? body?.content ?? '').trim()
  const g = body?.geo
  const geo: ClientGeo = {
    latitude: typeof g?.latitude === 'number' ? g.latitude : undefined,
    longitude: typeof g?.longitude === 'number' ? g.longitude : undefined,
    city: typeof g?.city === 'string' ? g.city : undefined,
  }

  reply.raw.writeHead(200, sseStreamHeaders)
  await pipeAgentSse(request, reply, sessionId, userText, geo)
})

app.get('/local-agent/session/:sessionId/emotion', async (request) => {
  const sessionId = String((request.params as { sessionId?: string }).sessionId ?? '')
  const record = await sessionStore.get(sessionId)
  const snap = record?.emotionSnapshot
  if (!snap) {
    return {
      label: '中性',
      emotionScore: 50,
      primaryEmotion: '待定',
      suggestion: '与「小暖」对话后，这里会显示本轮情绪与天气相关的觉察摘要。',
      improvementSuggestions: [] as string[],
      riskLevel: 0,
      isNegative: false,
      timestamp: Date.now(),
    }
  }
  return snapshotToEmotionApiBody(snap)
})

/** 每小时清理一次已过期会话，让 expiryTime（默认 24h）真正生效 */
const PURGE_INTERVAL_MS = 60 * 60 * 1000
const purgeTimer = setInterval(() => {
  sessionStore
    .purgeExpired()
    .then((count) => {
      if (count > 0) app.log.info(`已清理 ${count} 个过期会话`)
    })
    .catch((err) => app.log.error(err))
}, PURGE_INTERVAL_MS)
purgeTimer.unref()

const port = Number(process.env.PORT ?? 8787)
const host = process.env.HOST ?? '0.0.0.0'

await app.listen({ port, host })
app.log.info(`chat server listening http://${host}:${port}`)

const shutdown = () => {
  clearInterval(purgeTimer)
  sessionStore.close()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
