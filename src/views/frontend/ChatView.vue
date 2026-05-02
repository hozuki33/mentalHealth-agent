<script setup lang="ts">
import { Plus, Promotion } from '@element-plus/icons-vue'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchLocalAgentEmotion, streamLocalAgentChat, tryGetClientGeo } from '@/api/agentChat'
import {
  deleteSession,
  getKnowledgeList,
  getSessionDetail,
  getSessionEmotion,
  getSessionList,
} from '@/api/frontend'
import { formatDateTimeShort } from '@/utils/datetime'
import { getPageRecords } from '@/utils/apiPage'

type ChatRole = 'user' | 'assistant' | 'system'

interface SessionSummary {
  id: string | number
  title: string
  updatedAt: string
  summary: string
}

interface ChatMessage {
  id: string | number
  role: ChatRole
  content: string
  time: string
  pending?: boolean
}

interface KnowledgeArticle {
  id: string | number
  title: string
  summary: string
  category: string
}

interface EmotionReport {
  score: number | null
  label: string
  suggestion: string
  primaryEmotion?: string
  icon?: string
  riskDescription?: string
  weatherCorrelation?: string
  improvementSuggestions?: string[]
  riskLevel?: number
  isNegative?: boolean
  timestamp?: number
}

function normalizeEmotionImprovements(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.map((x) => String(x)).filter(Boolean)
}

function mapEmotionApiToReport(data: Record<string, unknown>): EmotionReport {
  const rawScore = data.emotionScore ?? data.score ?? data.averageEmotionScore
  const n = Number(rawScore)
  const score =
    rawScore === undefined || rawScore === null || rawScore === '' || Number.isNaN(n) ? null : n

  const riskN = Number(data.riskLevel ?? 0)
  const riskLevel = Number.isFinite(riskN) ? riskN : 0

  const ts = data.timestamp
  let timestamp: number | undefined
  if (typeof ts === 'number' && Number.isFinite(ts)) timestamp = ts
  else {
    const tn = Number(ts)
    if (Number.isFinite(tn)) timestamp = tn
  }

  return {
    score,
    label: String(data.label ?? data.primaryEmotion ?? data.emotion ?? data.emotionType ?? '中性'),
    suggestion: String(data.suggestion ?? data.advice ?? data.summary ?? '情绪状态平稳'),
    primaryEmotion:
      data.primaryEmotion !== undefined && data.primaryEmotion !== null
        ? String(data.primaryEmotion)
        : undefined,
    icon: data.icon !== undefined && data.icon !== null ? String(data.icon) : undefined,
    riskDescription:
      data.riskDescription !== undefined && data.riskDescription !== null
        ? String(data.riskDescription)
        : undefined,
    weatherCorrelation:
      data.weatherCorrelation !== undefined && data.weatherCorrelation !== null
        ? String(data.weatherCorrelation)
        : undefined,
    improvementSuggestions: normalizeEmotionImprovements(data.improvementSuggestions),
    riskLevel,
    isNegative: Boolean(data.isNegative),
    timestamp,
  }
}

const GREETING_MESSAGE_ID = 'greeting-welcome'
const LOCAL_CHAT_STORAGE_KEY = 'mh_chat_local_state_v1'

const sessions = ref<SessionSummary[]>([])
const activeSessionId = ref<string | number | null>(null)
const inputText = ref('')
const sessionLoading = ref(false)
const messageLoading = ref(false)
const sending = ref(false)
const emotionLoading = ref(false)
const knowledgeLoading = ref(false)
const emotionReport = ref<EmotionReport | null>(null)
const knowledgeArticles = ref<KnowledgeArticle[]>([])
const messageListRef = ref<HTMLElement>()
const INPUT_MAX = 500

const quickPrompts = [
  '我最近总是感到焦虑，应该怎么缓解？',
  '帮我做一次睡前放松引导。',
  '我今天情绪低落，想聊聊原因。',
  '给我一个 5 分钟正念练习。',
]

const localChatMessages = new Map<string | number, ChatMessage[]>()

function isLocalSessionId(id: string | number | null): boolean {
  return id != null && String(id).startsWith('local_')
}

function stripPendingMessages(msgs: ChatMessage[]): ChatMessage[] {
  return msgs.filter((m) => !m.pending)
}

/** 将本地对话写入 localStorage，刷新后可恢复 */
function persistLocalChatState() {
  try {
    const localSessions = sessions.value.filter((s) => isLocalSessionId(s.id))
    if (!localSessions.length) {
      localStorage.removeItem(LOCAL_CHAT_STORAGE_KEY)
      return
    }
    const messagesRecord: Record<string, ChatMessage[]> = {}
    for (const s of localSessions) {
      const sid = String(s.id)
      const raw =
        activeSessionId.value === s.id ? messages.value : (localChatMessages.get(s.id) ?? [])
      messagesRecord[sid] = stripPendingMessages(raw)
    }
    const active =
      activeSessionId.value != null && isLocalSessionId(activeSessionId.value)
        ? String(activeSessionId.value)
        : null
    localStorage.setItem(
      LOCAL_CHAT_STORAGE_KEY,
      JSON.stringify({ v: 1, sessions: localSessions, messages: messagesRecord, activeId: active }),
    )
  } catch {
  }
}

function restoreLocalChatFromStorage() {
  try {
    const raw = localStorage.getItem(LOCAL_CHAT_STORAGE_KEY)
    if (!raw) return
    const data = JSON.parse(raw) as {
      v?: number
      sessions?: SessionSummary[]
      messages?: Record<string, ChatMessage[]>
      activeId?: string | null
    }
    if (!data?.sessions || !Array.isArray(data.sessions)) return

    const localSessions = data.sessions.filter((s) => isLocalSessionId(s.id))
    if (!localSessions.length) return

    sessions.value = localSessions
    localChatMessages.clear()
    const msgMap = data.messages && typeof data.messages === 'object' ? data.messages : {}
    for (const s of localSessions) {
      const sid = String(s.id)
      const list = msgMap[sid]
      localChatMessages.set(s.id, Array.isArray(list) ? stripPendingMessages(list) : [])
    }

    const aid = data.activeId != null && data.activeId !== '' ? String(data.activeId) : null
    if (aid && localSessions.some((s) => String(s.id) === aid)) {
      activeSessionId.value = aid
      const loaded = localChatMessages.get(aid) ?? []
      messages.value = loaded.length ? [...loaded] : [createGreetingMessage()]
    } else {
      activeSessionId.value = null
      messages.value = [createGreetingMessage()]
    }
  } catch {
    /* 忽略损坏数据 */
  }
}

const greetingText =
  '您好！我是小暖，您的AI心理健康助手。无论您是想倾诉烦恼、缓解压力，还是需要一些放松建议，我都会耐心倾听并陪伴您。这里没有评判，只有理解与支持。请告诉我，今天您感觉怎么样？或者有什么想聊的吗？'

function createGreetingMessage(): ChatMessage {
  return {
    id: GREETING_MESSAGE_ID,
    role: 'assistant',
    content: greetingText,
    time: '刚刚',
  }
}

const messages = ref<ChatMessage[]>([createGreetingMessage()])

/** 仅有欢迎语时展示快捷提示条，发送消息后仍保留欢迎气泡 */
const showQuickPrompts = computed(() => {
  const list = messages.value
  return list.length === 1 && list[0]?.id === GREETING_MESSAGE_ID
})

const moodGardenDisplay = computed(() => {
  const empty = {
    icon: '',
    label: '中性',
    primarySubtitle: '',
    score: 50,
    moodLine: '今天感觉还可以',
    suggestion: '情绪状态平稳',
    improvements: [] as string[],
    tier: 'mid' as const,
    riskLevel: 0,
  }

  if (!emotionReport.value?.label) return empty

  const er = emotionReport.value
  const score = er.score
  const rounded = score !== null && !Number.isNaN(score) ? Math.min(100, Math.max(0, Math.round(score))) : 50

  let tier: 'high' | 'mid' | 'low' =
    score !== null ? (score >= 60 ? 'high' : score <= 40 ? 'low' : 'mid') : 'mid'
  if (er.isNegative || (er.riskLevel ?? 0) > 0) {
    tier = 'low'
  }

  const moodLine =
    er.weatherCorrelation?.trim() ||
    er.riskDescription ||
    (score !== null && score >= 60
      ? '今天感觉很不错'
      : score !== null && score <= 40
        ? '今天需要多照顾自己'
        : '今天感觉还可以')

  const primarySubtitle =
    er.primaryEmotion && er.primaryEmotion !== er.label ? er.primaryEmotion : ''

  return {
    icon: er.icon ?? '',
    label: er.label,
    primarySubtitle,
    score: rounded,
    moodLine,
    suggestion: er.suggestion || '情绪状态平稳',
    improvements: er.improvementSuggestions ?? [],
    tier,
    riskLevel: er.riskLevel ?? 0,
  }
})

watch(inputText, (v) => {
  if (v.length > INPUT_MAX) inputText.value = v.slice(0, INPUT_MAX)
})

function normalizeRole(value: unknown): ChatRole {
  const role = String(value ?? '').toLowerCase()
  if (['user', 'client', 'human', '用户'].includes(role)) return 'user'
  if (['system', '系统'].includes(role)) return 'system'
  return 'assistant'
}

function normalizeSession(item: unknown, index = 0): SessionSummary {
  const row = (item ?? {}) as Record<string, unknown>
  const id = row.id ?? row.sessionId ?? row.chatSessionId ?? index
  return {
    id: id as string | number,
    title: String(row.title ?? row.topic ?? row.sessionTitle ?? row.name ?? `心理咨询 ${index + 1}`),
    updatedAt: formatDateTimeShort(row.updatedAt ?? row.updateTime ?? row.createTime ?? row.createdAt),
    summary: String(row.summary ?? row.description ?? row.lastMessage ?? '暂无摘要'),
  }
}

function normalizeMessage(item: unknown, index: number): ChatMessage {
  const row = (item ?? {}) as Record<string, unknown>
  return {
    id: (row.id ?? row.messageId ?? `message-${index}`) as string | number,
    role: normalizeRole(row.role ?? row.senderType ?? row.sender),
    content: String(row.content ?? row.message ?? row.text ?? row.answer ?? ''),
    time:
      formatDateTimeShort(row.time ?? row.createTime ?? row.createdAt) ||
      new Date().toLocaleTimeString('zh-CN', { hour12: false }),
  }
}

function normalizeArticle(item: unknown, index: number): KnowledgeArticle {
  const row = (item ?? {}) as Record<string, unknown>
  return {
    id: (row.id ?? row.articleId ?? index) as string | number,
    title: String(row.title ?? row.name ?? `心理知识 ${index + 1}`),
    summary: String(row.summary ?? row.description ?? row.content ?? '暂无简介').slice(0, 90),
    category: String(row.categoryName ?? row.category ?? '知识文章'),
  }
}

async function scrollToBottom() {
  await nextTick()
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  }
}

async function loadSessions() {
  sessionLoading.value = true
  try {
    const data = await getSessionList({ pageNum: 1, pageSize: 30 })
    const remote = getPageRecords(data)
      .map(normalizeSession)
      .filter((item) => item.id !== undefined && item.id !== null)
    const localPreserved = sessions.value.filter((s) => isLocalSessionId(s.id))
    const remoteIds = new Set(remote.map((r) => r.id))
    sessions.value = [...localPreserved.filter((l) => !remoteIds.has(l.id)), ...remote]
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '会话列表加载失败')
  } finally {
    sessionLoading.value = false
  }
}

async function loadKnowledge() {
  knowledgeLoading.value = true
  try {
    const data = await getKnowledgeList({ pageNum: 1, pageSize: 4 })
    knowledgeArticles.value = getPageRecords(data).map(normalizeArticle)
  } catch {
    knowledgeArticles.value = []
  } finally {
    knowledgeLoading.value = false
  }
}

async function refreshSidebarEmotion() {
  if (!activeSessionId.value) {
    emotionReport.value = null
    return
  }
  try {
    if (isLocalSessionId(activeSessionId.value)) {
      const data = await fetchLocalAgentEmotion(String(activeSessionId.value))
      emotionReport.value = mapEmotionApiToReport(data)
    } else {
      const data = (await getSessionEmotion(activeSessionId.value)) as Record<string, unknown>
      emotionReport.value = mapEmotionApiToReport(data)
    }
  } catch {
    emotionReport.value = null
  }
}

async function selectSession(session: SessionSummary) {
  if (isLocalSessionId(activeSessionId.value)) {
    localChatMessages.set(activeSessionId.value!, [...messages.value])
  }
  activeSessionId.value = session.id
  emotionReport.value = null
  messageLoading.value = true
  try {
    if (isLocalSessionId(session.id)) {
      const loaded = [...(localChatMessages.get(session.id) ?? [])]
      messages.value = loaded.length ? loaded : [createGreetingMessage()]
      void refreshSidebarEmotion()
    } else {
      const data = await getSessionDetail(session.id)
      const loaded = getPageRecords(data).map(normalizeMessage).filter((item) => item.content)
      messages.value = loaded.length ? loaded : [createGreetingMessage()]
      void refreshSidebarEmotion()
    }
  } catch (error) {
    messages.value = [createGreetingMessage()]
    ElMessage.error(error instanceof Error ? error.message : '对话消息加载失败')
  } finally {
    messageLoading.value = false
    persistLocalChatState()
    scrollToBottom()
  }
}

function resetConversation() {
  if (isLocalSessionId(activeSessionId.value)) {
    localChatMessages.set(activeSessionId.value!, [...messages.value])
  }
  activeSessionId.value = null
  emotionReport.value = null
  messages.value = [createGreetingMessage()]
  persistLocalChatState()
}

function createLocalSession(firstMessage: string) {
  const sessionTitle = (firstMessage || '新的心理咨询').slice(0, 24)
  const id = `local_${Date.now()}`
  const session: SessionSummary = {
    id,
    title: sessionTitle || '新的心理咨询',
    updatedAt: formatDateTimeShort(new Date().toISOString()),
    summary: '本地对话',
  }
  activeSessionId.value = id
  localChatMessages.set(id, [])
  if (!sessions.value.some((item) => item.id === id)) {
    sessions.value.unshift(session)
  }
  persistLocalChatState()
  return session
}

async function submitMessage() {
  const content = inputText.value.trim()
  if (!content || sending.value) return

  if (activeSessionId.value && !isLocalSessionId(activeSessionId.value)) {
    activeSessionId.value = null
    messages.value = [createGreetingMessage()]
  }

  inputText.value = ''
  sending.value = true
  emotionReport.value = null

  const userMessage: ChatMessage = {
    id: `local-user-${Date.now()}`,
    role: 'user',
    content,
    time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
  }
  const pendingMessage: ChatMessage = {
    id: `local-assistant-${Date.now()}`,
    role: 'assistant',
    content: '正在思考中...',
    time: '',
    pending: true,
  }
  messages.value.push(userMessage, pendingMessage)
  scrollToBottom()

  try {
    if (!activeSessionId.value) {
      createLocalSession(content)
    }

    let acc = ''
    const geo = await tryGetClientGeo()
    await streamLocalAgentChat(
      {
        sessionId: String(activeSessionId.value),
        userMessage: content,
        geo,
      },
      (delta) => {
        acc += delta
        const pendingIndex = messages.value.findIndex((item) => item.id === pendingMessage.id)
        if (pendingIndex > -1) {
          const row = messages.value[pendingIndex]
          messages.value[pendingIndex] = {
            ...row,
            content: acc || '正在思考中...',
            time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
            pending: true,
          }
        }
      },
    )
    const pendingIndex = messages.value.findIndex((item) => item.id === pendingMessage.id)
    if (pendingIndex > -1) {
      const row = messages.value[pendingIndex]
      messages.value[pendingIndex] = {
        ...row,
        content: acc.trim() || '我已经收到你的消息，会继续陪你梳理。',
        pending: false,
        time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      }
    }

    await loadSessions()
    void refreshSidebarEmotion()
  } catch (error) {
    messages.value = messages.value.filter((item) => item.id !== pendingMessage.id)
    inputText.value = content
    ElMessage.error(error instanceof Error ? error.message : '消息发送失败，请稍后再试')
  } finally {
    if (isLocalSessionId(activeSessionId.value)) {
      localChatMessages.set(activeSessionId.value!, [...messages.value])
    }
    persistLocalChatState()
    sending.value = false
    scrollToBottom()
  }
}

function usePrompt(prompt: string) {
  inputText.value = prompt
}

async function removeSession(session: SessionSummary) {
  const confirmed = await ElMessageBox.confirm(`确认删除「${session.title}」吗？`, '删除会话', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    confirmButtonClass: 'el-button--danger',
    type: 'warning',
  }).catch(() => false)
  if (!confirmed) return

  try {
    if (!isLocalSessionId(session.id)) {
      await deleteSession(session.id)
    } else {
      localChatMessages.delete(session.id)
    }
    sessions.value = sessions.value.filter((item) => item.id !== session.id)
    if (activeSessionId.value === session.id) {
      resetConversation()
      if (sessions.value.length) await selectSession(sessions.value[0])
    }
    persistLocalChatState()
    ElMessage.success('会话已删除')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '会话删除失败')
  }
}

async function loadEmotionReport() {
  if (!activeSessionId.value) {
    ElMessage.warning('请先开始一段对话')
    return
  }
  emotionLoading.value = true
  try {
    if (isLocalSessionId(activeSessionId.value)) {
      const data = await fetchLocalAgentEmotion(String(activeSessionId.value))
      emotionReport.value = mapEmotionApiToReport(data)
    } else {
      const data = (await getSessionEmotion(activeSessionId.value)) as Record<string, unknown>
      emotionReport.value = mapEmotionApiToReport(data)
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '情绪分析加载失败')
  } finally {
    emotionLoading.value = false
  }
}

onMounted(async () => {
  restoreLocalChatFromStorage()
  await loadSessions()
  void loadKnowledge()
  if (activeSessionId.value && isLocalSessionId(activeSessionId.value)) {
    void refreshSidebarEmotion()
  }
  void scrollToBottom()
})
</script>

<template>
  <div class="chat-page">
    <aside class="left-rail">
      <div class="side-card profile-card">
        <div class="profile-card__avatar" aria-hidden="true">
          <svg class="profile-card__robot" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
            <rect x="14" y="20" width="36" height="28" rx="6" fill="none" stroke="currentColor" stroke-width="2.5" />
            <circle cx="26" cy="34" r="3.5" fill="currentColor" />
            <circle cx="38" cy="34" r="3.5" fill="currentColor" />
            <path d="M24 44h16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
            <path d="M32 20V12M24 12h16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
            <circle cx="32" cy="8" r="3" fill="currentColor" />
          </svg>
        </div>
        <div class="profile-card__text">
          <div class="profile-card__name">小暖助手</div>
          <div class="profile-card__status">
            <span class="profile-card__dot" />
            在线服务中
          </div>
        </div>
      </div>

      <div class="side-card mood-card">
        <div class="mood-card__title">情绪花园</div>
        <div
          class="mood-gauge"
          :class="{
            'mood-gauge--high': moodGardenDisplay.tier === 'high',
            'mood-gauge--low': moodGardenDisplay.tier === 'low',
          }"
        >
          <div class="mood-gauge__inner">
            <span v-if="moodGardenDisplay.icon" class="mood-gauge__icon" aria-hidden="true">{{ moodGardenDisplay.icon }}</span>
            <span class="mood-gauge__label">{{ moodGardenDisplay.label }}</span>
            <span class="mood-gauge__score">{{ moodGardenDisplay.score }}</span>
          </div>
        </div>
        <p v-if="moodGardenDisplay.primarySubtitle" class="mood-card__primary">主情绪 · {{ moodGardenDisplay.primarySubtitle }}</p>
        <p class="mood-card__line">{{ moodGardenDisplay.moodLine }}</p>
        <div class="mood-dots" aria-hidden="true">
          <span :class="{ 'is-on': moodGardenDisplay.tier === 'low' }" />
          <span :class="{ 'is-on': moodGardenDisplay.tier === 'mid' }" />
          <span :class="{ 'is-on': moodGardenDisplay.tier === 'high' }" />
          <span class="mood-dots__cap">一般</span>
        </div>
        <div class="suggest-card">
          <div class="suggest-card__head">
            <span class="suggest-card__heart" aria-hidden="true">♥</span>
            给你的小建议
          </div>
          <p class="suggest-card__body">{{ moodGardenDisplay.suggestion }}</p>
          <template v-if="moodGardenDisplay.improvements.length">
            <div class="suggest-card__subhead">可以试试</div>
            <ul class="suggest-card__list">
              <li v-for="(tip, idx) in moodGardenDisplay.improvements" :key="idx">{{ tip }}</li>
            </ul>
          </template>
        </div>
        <div class="mood-card__actions">
          <el-button link type="primary" size="small" :loading="emotionLoading" @click="loadEmotionReport">
            刷新情绪分析
          </el-button>
        </div>
      </div>

      <div class="side-card history-card">
        <div class="history-card__head">
          <span class="history-card__title">会话历史</span>
          <el-button link type="primary" size="small" @click="loadSessions">刷新</el-button>
        </div>
        <div v-loading="sessionLoading" class="session-list">
          <div v-if="!sessions.length && !sessionLoading" class="history-empty">暂无会话记录</div>
          <button
            v-for="session in sessions"
            :key="session.id"
            class="session-item"
            :class="{ 'session-item--active': session.id === activeSessionId }"
            type="button"
            @click="selectSession(session)"
          >
            <span class="session-item__main">
              <strong>{{ session.title }}</strong>
              <small>{{ session.summary }}</small>
            </span>
            <span class="session-item__meta">
              <small>{{ session.updatedAt || '刚刚' }}</small>
              <el-button link type="danger" size="small" @click.stop="removeSession(session)">删除</el-button>
            </span>
          </button>
        </div>
        
      </div>
    </aside>

    <main class="chat-shell">
      <div class="chat-card">
        <header class="chat-top">
          <div class="chat-top__left">
            <div class="chat-top__icon-wrap" aria-hidden="true">
              <svg class="chat-top__heart" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12 21s-6.716-4.35-9-8.5C1.5 9.5 3 6 6.5 6 9 6 12 9 12 9s3-3 5.5-3C21 6 22.5 9.5 21 12.5 18.716 16.65 12 21 12 21Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <div>
              <div class="chat-top__title">小暖助手</div>
              <div class="chat-top__subtitle">您的贴心AI心理健康助手</div>
            </div>
          </div>
          <button type="button" class="chat-top__new" title="新对话" aria-label="新对话" @click="resetConversation">
            <el-icon :size="20"><Plus /></el-icon>
          </button>
        </header>

        <section ref="messageListRef" v-loading="messageLoading" class="message-list">
          <template v-for="message in messages" :key="message.id">
            <div
              v-if="message.role !== 'system'"
              class="message-row"
              :class="`message-row--${message.role}`"
            >
              <div
                class="message-avatar"
                :class="message.role === 'assistant' ? 'message-avatar--bot' : 'message-avatar--user'"
              >
                <template v-if="message.role === 'assistant'">
                  <svg class="message-avatar__svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                    <rect x="14" y="20" width="36" height="28" rx="6" fill="none" stroke="currentColor" stroke-width="2.5" />
                    <circle cx="26" cy="34" r="3.5" fill="currentColor" />
                    <circle cx="38" cy="34" r="3.5" fill="currentColor" />
                    <path d="M24 44h16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
                  </svg>
                </template>
                <template v-else>我</template>
              </div>
              <div
                class="message-bubble"
                :class="{
                  'message-bubble--assistant': message.role === 'assistant',
                  'message-bubble--user': message.role === 'user',
                  'message-bubble--pending': message.pending,
                }"
              >
                <p>{{ message.content }}</p>
                <span v-if="message.time" class="message-bubble__time">{{ message.time }}</span>
              </div>
            </div>
          </template>

          <div v-if="showQuickPrompts" class="prompt-chips">
            <button v-for="prompt in quickPrompts" :key="prompt" type="button" class="prompt-chip" @click="usePrompt(prompt)">
              {{ prompt }}
            </button>
          </div>
        </section>

        <section class="composer">
          <div class="composer__field">
            <el-input
              v-model="inputText"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 5 }"
              resize="none"
              :maxlength="INPUT_MAX"
              placeholder="请输入您想要分享的内容..."
              class="composer__input"
              @keydown.enter.exact.prevent="submitMessage"
            />
            <div class="composer__bar">
              <span class="composer__hint">按 Enter 发送，Shift + Enter 换行</span>
              <span class="composer__count">{{ inputText.length }}/{{ INPUT_MAX }}</span>
            </div>
          </div>
          <button type="button" class="composer__send" :disabled="sending || !inputText.trim()" @click="submitMessage">
            <el-icon v-if="!sending" :size="22"><Promotion /></el-icon>
            <span v-else class="composer__sending">…</span>
          </button>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.chat-page {
  --orange: var(--chat-orange);
  --orange-dark: var(--chat-orange-dark);
  --cream: var(--chat-cream);
  --card-bg: var(--chat-card-bg);
  --text: var(--chat-text);
  --muted: var(--chat-muted);

  flex: 1;
  min-height: 0;
  width: 100%;
  max-width: 1160px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 268px minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  gap: 16px;
  padding: 16px 20px;
  background: var(--cream);
  color: var(--text);
  box-sizing: border-box;
  overflow: hidden;
}

.left-rail {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
  overflow: hidden;
  overscroll-behavior: contain;
}

.side-card {
  background: var(--card-bg);
  border-radius: 18px;
  padding: 18px;
  box-shadow: 0 4px 24px rgba(61, 52, 41, 0.06);
  border: 1px solid var(--chat-side-card-border);
}

.profile-card {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}

.profile-card__avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(145deg, var(--orange), var(--orange-dark));
  display: grid;
  place-items: center;
  flex-shrink: 0;
  box-shadow: 0 4px 14px rgba(240, 160, 62, 0.35);
}

.profile-card__robot {
  width: 30px;
  height: 30px;
  color: #fff;
}

.profile-card__name {
  font-weight: 700;
  font-size: 16px;
}

.profile-card__status {
  margin-top: 6px;
  font-size: 13px;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 6px;
}

.profile-card__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #52c41a;
  box-shadow: 0 0 0 3px rgba(82, 196, 26, 0.25);
}

.mood-card {
  flex-shrink: 0;
}

.mood-card__title {
  font-weight: 700;
  font-size: 15px;
  margin-bottom: 14px;
  color: var(--text);
}

.mood-gauge {
  width: 132px;
  height: 132px;
  margin: 0 auto;
  border-radius: 50%;
  background: linear-gradient(160deg, #ffb6c8, #ffc9d8 40%, #ffe0e8);
  display: grid;
  place-items: center;
  box-shadow: inset 0 2px 12px rgba(255, 255, 255, 0.65);
}

.mood-gauge--high {
  background: linear-gradient(160deg, #ffb8d0, #ffd4e0 45%, #ffe8f0);
}

.mood-gauge--low {
  background: linear-gradient(160deg, #d4e0f0, #e8eef8 50%, #f0f4fc);
}

.mood-gauge__inner {
  width: 108px;
  height: 108px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.88);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
}

.mood-gauge__icon {
  font-size: 26px;
  line-height: 1;
}

.mood-card__primary {
  text-align: center;
  margin: 8px 0 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
}

.mood-gauge__label {
  font-size: 15px;
  font-weight: 700;
  color: #c45c7a;
}

.mood-gauge--low .mood-gauge__label {
  color: #5b7ab8;
}

.mood-gauge__score {
  font-size: 26px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.02em;
}

.mood-card__line {
  text-align: center;
  margin: 10px 0 10px;
  font-size: 14px;
  color: var(--muted);
}

.mood-dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-bottom: 14px;
}

.mood-dots span:first-of-type,
.mood-dots span:nth-of-type(2),
.mood-dots span:nth-of-type(3) {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f5d0d8;
}

.mood-dots span.is-on {
  background: #e86b8a;
  transform: scale(1.15);
}

.mood-dots__cap {
  margin-left: 6px;
  font-size: 13px;
  color: var(--muted);
}

.suggest-card {
  background: var(--chat-suggest-bg);
  border-radius: 14px;
  padding: 12px 14px;
  border: 1px solid rgba(0, 0, 0, 0.04);
  box-shadow: 0 2px 12px rgba(61, 52, 41, 0.05);
}

.suggest-card__head {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 6px;
}

.suggest-card__heart {
  color: #e86b8a;
  font-size: 14px;
}

.suggest-card__body {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--muted);
}

.suggest-card__subhead {
  margin-top: 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}

.suggest-card__list {
  margin: 6px 0 0;
  padding-left: 1.15em;
  font-size: 12px;
  line-height: 1.5;
  color: var(--muted);
}

.suggest-card__list li {
  margin: 3px 0;
}

.mood-card__actions {
  margin-top: 10px;
  text-align: center;
}

.history-card {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.history-card__head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.history-card__title {
  font-weight: 700;
  font-size: 15px;
}

.session-list {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  margin: 0 -6px;
  padding: 0 6px;
}

.history-empty {
  text-align: center;
  padding: 28px 12px;
  font-size: 14px;
  color: var(--muted);
}

.session-item {
  width: 100%;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 10px;
  margin-bottom: 6px;
  border: 0;
  border-radius: 12px;
  background: var(--chat-session-item-bg);
  text-align: left;
  cursor: pointer;
  border: 1px solid transparent;
}

.session-item:hover,
.session-item--active {
  background: var(--chat-session-item-active-bg);
  border-color: var(--chat-session-border);
}

.session-item__main {
  min-width: 0;
}

.session-item__main strong,
.session-item__main small,
.session-item__meta small {
  display: block;
}

.session-item__main strong {
  overflow: hidden;
  color: var(--text);
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}

.session-item__main small {
  margin-top: 4px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}

.session-item__meta {
  flex-shrink: 0;
  text-align: right;
  color: var(--chat-meta-muted);
  font-size: 11px;
}

.chat-shell {
  min-width: 0;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat-card {
  flex: 1;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--chat-card-surface);
  border-radius: 22px;
  overflow: hidden;
  box-shadow: 0 8px 40px rgba(61, 52, 41, 0.08);
  border: 1px solid var(--chat-card-border);
}

.chat-top {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  background: linear-gradient(90deg, var(--orange) 0%, var(--orange-dark) 100%);
  color: #fff;
}

.chat-top__left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.chat-top__icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.22);
  display: grid;
  place-items: center;
}

.chat-top__heart {
  width: 22px;
  height: 22px;
  color: #fff;
}

.chat-top__title {
  font-weight: 700;
  font-size: 17px;
  letter-spacing: 0.02em;
}

.chat-top__subtitle {
  margin-top: 4px;
  font-size: 13px;
  opacity: 0.92;
}

.chat-top__new {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: background 0.15s ease;
}

.chat-top__new:hover {
  background: rgba(255, 255, 255, 0.32);
}

.message-list {
  flex: 1 1 0;
  min-height: 0;
  padding: 22px 24px;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: var(--chat-msg-area-bg);
}

.message-row {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  align-items: flex-start;
}

.message-row--user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 700;
}

.message-avatar--bot {
  background: linear-gradient(145deg, var(--orange), var(--orange-dark));
  color: #fff;
}

.message-avatar__svg {
  width: 22px;
  height: 22px;
}

.message-avatar--user {
  background: var(--chat-avatar-user-bg);
  color: var(--text);
}

.message-bubble {
  max-width: min(520px, 90%);
  padding: 14px 18px;
  border-radius: 16px;
}

.message-bubble--assistant {
  background: var(--chat-bubble-assistant-bg);
  color: var(--text);
}

.message-bubble--user {
  background: linear-gradient(135deg, var(--orange), var(--orange-dark));
  color: #fff;
}

.message-bubble p {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.75;
  font-size: 14px;
}

.message-bubble__time {
  display: block;
  margin-top: 10px;
  font-size: 12px;
  color: var(--muted);
}

.message-bubble--user .message-bubble__time {
  color: rgba(255, 255, 255, 0.85);
}

.message-bubble--pending {
  color: var(--muted);
}

.prompt-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  padding-left: 52px;
}

.prompt-chip {
  font-size: 12px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(240, 160, 62, 0.35);
  background: var(--chat-chip-bg);
  color: var(--orange-dark);
  cursor: pointer;
  font-family: inherit;
}

.prompt-chip:hover {
  background: rgba(240, 160, 62, 0.1);
}

.composer {
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  gap: 12px;
  padding: 16px 20px 20px;
  background: var(--chat-composer-bg);
  border-top: 1px solid var(--chat-composer-top-border);
}

.composer__field {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--chat-input-border);
  border-radius: 16px;
  padding: 4px 4px 8px 12px;
  background: var(--chat-composer-field-bg);
}

.composer__input :deep(.el-textarea__inner) {
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 8px 8px 4px 0;
  font-size: 14px;
  color: var(--text);
}

.composer__input :deep(.el-textarea__inner:focus) {
  box-shadow: none;
}

.composer__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px 0 0;
}

.composer__hint {
  font-size: 12px;
  color: var(--muted);
}

.composer__count {
  font-size: 12px;
  color: var(--chat-meta-muted);
}

.composer__send {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  border: none;
  border-radius: 14px;
  background: linear-gradient(145deg, var(--orange), var(--orange-dark));
  color: #fff;
  cursor: pointer;
  display: grid;
  place-items: center;
  box-shadow: 0 4px 16px rgba(240, 160, 62, 0.4);
  transition: opacity 0.15s ease, transform 0.1s ease;
}

.composer__send:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

.composer__send:not(:disabled):hover {
  transform: translateY(-1px);
}

.composer__sending {
  font-size: 20px;
  letter-spacing: 2px;
}

@media (max-width: 1100px) {
  .chat-page {
    grid-template-columns: 260px minmax(0, 1fr);
    padding: 16px 24px;
  }
}

@media (max-width: 820px) {
  .chat-page {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr);
  }

  .left-rail {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .profile-card,
  .mood-card {
    flex: 1;
    min-width: 200px;
  }

  .history-card {
    width: 100%;
    max-height: 220px;
  }

  .prompt-chips {
    padding-left: 0;
  }
}

@media (max-width: 560px) {
  .chat-page {
    padding: 12px;
    gap: 12px;
  }

  .message-list {
    padding: 16px;
  }

  .composer {
    flex-wrap: wrap;
  }

  .composer__send {
    width: 100%;
    height: 48px;
  }
}
</style>
