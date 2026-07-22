import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages'
import type { ChatOpenAI } from '@langchain/openai'
import { encodingForModel } from 'js-tiktoken'

/**
 * 默认阈值：历史消息总 token 数超过此值时触发压缩。
 * 可通过环境变量 MEMORY_MAX_TOKENS 覆盖。
 */
export const DEFAULT_MAX_TOKENS = Number(process.env.MEMORY_MAX_TOKENS) > 0
  ? Number(process.env.MEMORY_MAX_TOKENS)
  : 8000

/**
 * 压缩后保留最近 K 条原始消息在窗口内。
 */
export const DEFAULT_KEEP_RECENT = Number(process.env.MEMORY_KEEP_RECENT) > 0
  ? Number(process.env.MEMORY_KEEP_RECENT)
  : 6

// 使用 cl100k_base 编码器（GPT-4/GPT-3.5/DeepSeek 等主流模型通用的分词器）
const encoder = encodingForModel('gpt-4o')

const SUMMARIZE_PROMPT = `你是一个对话摘要助手。请阅读下面这段用户与心理健康陪伴助手「小暖」的历史对话，
将其压缩为一段简明摘要，用于后续对话的上下文记忆。

【已有摘要（如果有）】
{previousSummary}

【新增对话内容】
{conversation}

摘要要求：
1. 保留用户提到的关键个人信息、长期困扰、情绪变化趋势；
2. 必须显式保留任何自伤/伤人倾向、严重情绪风险的线索，不得省略或弱化；
3. 保留讨论过的关键建议和用户的反馈态度；
4. 用第三人称客观陈述，控制在 200 字以内；
5. 不要输出与本次任务无关的内容。`

/**
 * 提取消息的文本内容
 */
function getMessageText(msg: BaseMessage): string {
  return typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
}

/**
 * 估算一组消息的总 token 数。
 */
export function estimateTokenCount(messages: BaseMessage[]): number {
  let total = 0
  for (const msg of messages) {
    // 每条消息的 overhead（role 标记等）约 4 token
    total += 4
    total += encoder.encode(getMessageText(msg)).length
  }
  return total
}

/**
 * 将一批消息格式化成可读的对话文本，供摘要 prompt 使用。
 */
function formatMessagesForSummary(messages: BaseMessage[]): string {
  return messages
    .map((msg) => {
      const role = msg instanceof HumanMessage ? '用户' : msg instanceof AIMessage ? '小暖' : '系统'
      return `${role}：${getMessageText(msg)}`
    })
    .join('\n')
}

/**
 * 判断当前消息历史是否需要触发摘要压缩（基于 token 数估算）。
 */
export function shouldCompress(
  messages: BaseMessage[],
  maxTokens: number = DEFAULT_MAX_TOKENS,
): boolean {
  return estimateTokenCount(messages) > maxTokens
}

/**
 * 对超出窗口的早期消息调用 LLM 生成摘要。
 * 如果已有旧摘要，会把旧摘要作为输入让 LLM 合并进新摘要（滚动更新）。
 *
 * @returns 新的摘要文本
 */
export async function summarizeHistory(params: {
  llm: ChatOpenAI
  previousSummary?: string
  messagesToCompress: BaseMessage[]
}): Promise<string> {
  const { llm, previousSummary, messagesToCompress } = params

  const conversation = formatMessagesForSummary(messagesToCompress)
  const prompt = SUMMARIZE_PROMPT
    .replace('{previousSummary}', previousSummary?.trim() || '（暂无）')
    .replace('{conversation}', conversation)

  // 使用非流式调用，摘要是后台逻辑不需要流式输出
  const response = await llm.invoke([new HumanMessage(prompt)])

  const content = typeof response.content === 'string'
    ? response.content
    : JSON.stringify(response.content)

  return content.trim()
}

/**
 * 执行一次完整的"压缩"操作：
 * 1. 把 messages 拆成"待压缩部分"和"保留窗口"两段
 * 2. 对待压缩部分调用 LLM 生成摘要（与已有摘要合并）
 * 3. 返回新的 summary 和裁剪后的 messages
 *
 * 裁剪策略：保留最近 keepRecent 条原始消息，但如果这样裁剪后
 * 窗口内 token 数仍然超限，会继续向前多保留一些消息以确保窗口内容不为空。
 */
export async function compressHistory(params: {
  llm: ChatOpenAI
  messages: BaseMessage[]
  previousSummary?: string
  keepRecent?: number
}): Promise<{ summary: string; trimmedMessages: BaseMessage[] }> {
  const { llm, messages, previousSummary } = params
  const keepRecent = params.keepRecent ?? DEFAULT_KEEP_RECENT

  // 至少保留 keepRecent 条，但不能超过总消息数
  const actualKeep = Math.min(keepRecent, messages.length)
  const cutIndex = messages.length - actualKeep
  const messagesToCompress = messages.slice(0, cutIndex)
  const trimmedMessages = messages.slice(cutIndex)

  const summary = await summarizeHistory({
    llm,
    previousSummary,
    messagesToCompress,
  })

  return { summary, trimmedMessages }
}
