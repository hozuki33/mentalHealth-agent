import type { FastifyBaseLogger } from 'fastify'
import type { ServerResponse } from 'node:http'
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages'
import type { ChatOpenAI } from '@langchain/openai'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { buildAgentTools, type ClientGeo, type EmotionGardenSnapshot } from './agentTools.js'
import { sseLine } from './sseLine.js'

function geoBlock(geo: ClientGeo): string {
  const lat = geo.latitude
  const lon = geo.longitude
  const city = geo.city?.trim()
  if (typeof lat === 'number' && typeof lon === 'number' && Number.isFinite(lat) && Number.isFinite(lon)) {
    return `【本轮客户端环境】纬度 ${lat.toFixed(4)}，经度 ${lon.toFixed(4)}${city ? `，城市提示：${city}` : ''}。查天气请调用 get_current_weather，勿编造实况。`
  }
  return '【本轮客户端环境】未提供有效经纬度。需要天气时可询问用户所在城市，或建议其允许浏览器定位。'
}

/** 在基础人设上追加工具与情绪花园说明 */
export function buildAgentSystemPrompt(baseSystem: string, geo: ClientGeo): string {
  const toolRules = `
【工具与情绪花园】
1. get_current_weather：获取真实天气后再谈「天气与情绪」的关系；无位置时先问城市或说明无法定位。
2. publish_emotion_garden_snapshot：在适当时机写入侧栏结构化摘要（分数、主情绪、建议、可选天气关联、改进建议）。每轮用户消息结束后尽量调用一次；若用户仅寒暄且情绪中性，仍给出温和的中性快照。
3. 仍遵守：不诊断、不开药；有自伤/伤人风险时明确建议联系紧急服务或专业人士。`
  return `${baseSystem.trim()}\n\n${geoBlock(geo)}\n${toolRules.trim()}`
}

export async function streamReactAgentToSse(params: {
  raw: ServerResponse
  log: FastifyBaseLogger
  llm: ChatOpenAI
  baseSystem: string
  history: BaseMessage[]
  userText: string
  sessionId: string
  geo: ClientGeo
  emotionSnapshots: Map<string, EmotionGardenSnapshot>
}): Promise<{ assistantText: string; nextHistory: BaseMessage[] }> {
  const { raw, log, llm, baseSystem, history, userText, sessionId, geo, emotionSnapshots } = params

  const tools = buildAgentTools(sessionId, emotionSnapshots, geo)
  const prompt = buildAgentSystemPrompt(baseSystem, geo)
  const agent = createReactAgent({
    llm,
    tools,
    prompt,
  })

  const messages: BaseMessage[] = [...history, new HumanMessage(userText)]
  let assistantAcc = ''

  try {
    const eventStream = agent.streamEvents(
      { messages },
      { version: 'v2', streamMode: 'messages' },
    )

    for await (const ev of eventStream) {
      if (ev.event !== 'on_chat_model_stream') continue
      const chunk = (ev.data as { chunk?: { content?: unknown } }).chunk
      if (!chunk) continue
      let text: string
      const c = chunk.content
      if (typeof c === 'string') {
        text = c
      } else if (Array.isArray(c)) {
        text = c
          .map((b) => {
            if (typeof b === 'object' && b !== null && 'type' in b && (b as { type: string }).type === 'text') {
              return String((b as { text?: string }).text ?? '')
            }
            return ''
          })
          .join('')
      } else {
        continue
      }
      if (!text) continue
      assistantAcc += text
      raw.write(sseLine({ content: text }))
    }
  } catch (err) {
    log.error(err)
    throw err
  }

  const trimmed = assistantAcc.trim()
  const nextHistory: BaseMessage[] = trimmed
    ? [...history, new HumanMessage(userText), new AIMessage(trimmed)]
    : [...history, new HumanMessage(userText)]

  return { assistantText: trimmed, nextHistory }
}
