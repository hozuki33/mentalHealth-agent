<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import PageHead from '@/components/PageHead.vue'
import TableSearch from '@/components/TableSearch.vue'
import { getConsultationPage, getSessionDetail } from '@/api/admin'
import { getSessionEmotion } from '@/api/frontend'
import { formatDateTimeShort } from '@/utils/datetime'
import { getPageRecords, getPageTotal } from '@/utils/apiPage'

type ConsultStatus = '待跟进' | '已跟进' | '已关闭'

const DEFAULT_ASSISTANT_NAME = '小暖助手'

interface ConsultRecord {
  id: string | number
  userName: string
  avatar: string
  assistantName: string
  previewTime: string
  previewSnippet: string
  messageCount: number
  time: string
  topic: string
  status: ConsultStatus
  summary: string
}

function pickSessionTime(row: Record<string, unknown>): unknown {
  const keys = [
    'time',
    'startTime',
    'sessionStartTime',
    'beginTime',
    'createTime',
    'createdAt',
    'gmtCreate',
    'createDate',
    'updatedAt',
    'updateTime',
    'gmtModified',
    'lastActiveTime',
  ]
  for (const k of keys) {
    const v = row[k]
    if (v !== undefined && v !== null && v !== '') return v
  }
  return undefined
}

function pickLastMessageTime(row: Record<string, unknown>): unknown {
  const keys = [
    'lastMessageTime',
    'lastMsgTime',
    'lastChatTime',
    'lastActiveTime',
    'updatedAt',
    'updateTime',
    'createTime',
    'createdAt',
  ]
  for (const k of keys) {
    const v = row[k]
    if (v !== undefined && v !== null && v !== '') return v
  }
  return pickSessionTime(row)
}

function pickMessageTime(row: Record<string, unknown>): unknown {
  const keys = ['sendTime', 'messageTime', 'msgTime', 'time', 'createTime', 'createdAt', 'gmtCreate', 'updatedAt']
  for (const k of keys) {
    const v = row[k]
    if (v !== undefined && v !== null && v !== '') return v
  }
  return undefined
}

function formatPreviewTime(value: unknown): string {
  if (!value) return '—'
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return formatDateTimeShort(value) || '—'
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${y}/${m}/${day} ${h}:${min}:${s}`
}

function pickMessageCount(row: Record<string, unknown>): number {
  const keys = ['messageCount', 'msgCount', 'totalMessages', 'messageNum', 'chatMessageCount']
  for (const k of keys) {
    const n = Number(row[k])
    if (Number.isFinite(n) && n >= 0) return Math.floor(n)
  }
  return 0
}

function pickAvatar(row: Record<string, unknown>): string {
  const u = row.userAvatar ?? row.avatar ?? row.headImg ?? row.headPortrait ?? row.photo ?? row.avatarUrl
  return u ? String(u) : ''
}

function pickPreviewSnippet(row: Record<string, unknown>): string {
  const text = String(
    row.lastMessage ?? row.lastMessageContent ?? row.lastMsg ?? row.preview ?? row.summary ?? row.description ?? '',
  )
  const t = text.trim()
  if (!t) return '暂无消息预览'
  return t.length > 160 ? `${t.slice(0, 160)}…` : t
}

const keyword = ref('')
const detailVisible = ref(false)
const activeConsult = ref<ConsultRecord | null>(null)
const loading = ref(false)
const detailLoading = ref(false)
const messages = ref<ConsultMessage[]>([])
const allConsults = ref<ConsultRecord[]>([])
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)

interface ConsultMessage {
  id: string | number
  role: string
  content: string
  time: string
}

const consults = computed(() => allConsults.value)

const emotionDetail = ref<{
  score: number | null
  label: string
  suggestion: string
} | null>(null)

function normalizeStatus(value: unknown): ConsultStatus {
  const statusValue = String(value ?? '').toLowerCase()
  if (['closed', 'close', '2', '已关闭'].includes(statusValue)) return '已关闭'
  if (['followed', 'processed', '1', '已跟进'].includes(statusValue)) return '已跟进'
  return '待跟进'
}

function resolveSessionId(row: Record<string, unknown>): string | number | undefined {
  const raw = row.id ?? row.sessionId ?? row.chatSessionId
  if (raw === undefined || raw === null) return undefined
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  const s = String(raw).trim()
  if (!s) return undefined
  const n = Number(s)
  if (Number.isFinite(n) && s === String(n)) return n
  return s
}

function normalizeConsult(item: unknown): ConsultRecord | null {
  const row = item as Record<string, unknown>
  const id = resolveSessionId(row)
  if (id === undefined || id === null || String(id) === '') return null
  const sessionTime = pickSessionTime(row)
  const lastMsgTime = pickLastMessageTime(row)
  return {
    id,
    userName: String(row.userName ?? row.nickname ?? row.username ?? row.userId ?? '匿名用户'),
    avatar: pickAvatar(row),
    assistantName: String(row.assistantName ?? row.aiName ?? DEFAULT_ASSISTANT_NAME),
    previewTime: formatPreviewTime(lastMsgTime),
    previewSnippet: pickPreviewSnippet(row),
    messageCount: pickMessageCount(row),
    time: formatDateTimeShort(sessionTime) || formatPreviewTime(sessionTime),
    topic: String(row.topic ?? row.title ?? row.sessionTitle ?? '心理咨询'),
    status: normalizeStatus(row.status),
    summary: String(row.summary ?? row.remark ?? row.description ?? '暂无摘要'),
  }
}

function normalizeMessage(item: unknown, index: number): ConsultMessage {
  const row = item as Record<string, unknown>
  return {
    id: String(row.id ?? row.messageId ?? index),
    role: String(row.role ?? row.senderType ?? row.sender ?? ''),
    content: String(row.content ?? row.message ?? row.text ?? ''),
    time: formatDateTimeShort(pickMessageTime(row)),
  }
}

async function runSearch() {
  loading.value = true
  try {
    const data = await getConsultationPage({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      keyword: keyword.value.trim() || undefined,
    })
    total.value = getPageTotal(data)
    allConsults.value = getPageRecords(data)
      .map((item) => normalizeConsult(item))
      .filter((item): item is ConsultRecord => item !== null)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '咨询记录加载失败')
  } finally {
    loading.value = false
  }
}

function onSearch() {
  pageNum.value = 1
  runSearch()
}

function onReset() {
  pageNum.value = 1
  runSearch()
}

function onPageChange(p: number) {
  pageNum.value = p
  runSearch()
}

function onSizeChange(s: number) {
  pageSize.value = s
  pageNum.value = 1
  runSearch()
}

function getStatusType(value: ConsultStatus) {
  if (value === '待跟进') return 'warning'
  if (value === '已跟进') return 'success'
  return 'info'
}

function mapEmotionPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null
  const raw = payload as Record<string, unknown>
  const inner = raw.data !== undefined && typeof raw.data === 'object' ? (raw.data as Record<string, unknown>) : raw
  const scoreRaw = inner.emotionScore ?? inner.score ?? inner.averageEmotionScore
  const n = Number(scoreRaw)
  const score =
    scoreRaw === undefined || scoreRaw === null || scoreRaw === '' || !Number.isFinite(n) ? null : n
  const label = String(inner.label ?? inner.primaryEmotion ?? inner.emotion ?? inner.emotionType ?? '')
  const suggestion = String(inner.suggestion ?? inner.advice ?? '')
  if (score === null && !label && !suggestion) return null
  return {
    score,
    label: label || '—',
    suggestion,
  }
}

async function openDetail(row: ConsultRecord) {
  activeConsult.value = row
  detailVisible.value = true
  detailLoading.value = true
  emotionDetail.value = null
  try {
    const [msgData, emotionPayload] = await Promise.all([
      getSessionDetail(row.id),
      getSessionEmotion(row.id).catch(() => null),
    ])
    messages.value = getPageRecords(msgData).map(normalizeMessage)
    emotionDetail.value = mapEmotionPayload(emotionPayload)
  } catch (error) {
    messages.value = []
    emotionDetail.value = null
    ElMessage.error(error instanceof Error ? error.message : '咨询详情加载失败')
  } finally {
    detailLoading.value = false
  }
}

onMounted(runSearch)
</script>

<template>
  <el-card shadow="never">
    <template #header>
      <PageHead title="咨询记录" :show-add="false" />
    </template>

    <TableSearch
      v-model="keyword"
      placeholder="搜索用户、会话内容或时间"
      @search="onSearch"
      @reset="onReset"
    />

    <el-table v-loading="loading" :data="consults">
      <el-table-column label="会话ID" width="168">
        <template #default="{ row }">
          <div class="session-user">
            <el-avatar :size="36" :src="row.avatar || undefined">{{ row.userName.slice(0, 1) }}</el-avatar>
            <span class="session-user__name">{{ row.userName }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="情绪日志" min-width="300">
        <template #default="{ row }">
          <div class="preview-block">
            <div class="preview-line">{{ row.assistantName }} - {{ row.previewTime }}</div>
            <div class="preview-snippet">{{ row.previewSnippet }}</div>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="messageCount" label="消息数" width="88" align="center" />
      <el-table-column label="时间" width="172">
        <template #default="{ row }">{{ row.time || '—' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="88" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="total > 0" class="pager-wrap">
      <el-pagination
        background
        layout="total, sizes, prev, pager, next"
        :total="total"
        :page-size="pageSize"
        :current-page="pageNum"
        :page-sizes="[10, 20, 50]"
        @current-change="onPageChange"
        @size-change="onSizeChange"
      />
    </div>

    <el-drawer v-model="detailVisible" title="咨询详情" size="520px">
      <el-descriptions v-if="activeConsult" :column="1" border>
        <el-descriptions-item label="用户">{{ activeConsult.userName }}</el-descriptions-item>
        <el-descriptions-item label="主题">{{ activeConsult.topic }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(activeConsult.status)">{{ activeConsult.status }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="消息数">{{ activeConsult.messageCount }}</el-descriptions-item>
        <el-descriptions-item label="咨询时间">{{ activeConsult.time || '—' }}</el-descriptions-item>
        <el-descriptions-item label="情绪分析">
          <template v-if="emotionDetail">
            <div>{{ emotionDetail.label }}</div>
            <template v-if="emotionDetail.score !== null">
              <el-rate :model-value="Math.min(5, Math.max(0, emotionDetail.score / 20))" disabled allow-half />
              <div class="emotion-score-hint">综合分 {{ Math.round(emotionDetail.score) }}（0–100）</div>
            </template>
          </template>
          <span v-else>{{ detailLoading ? '加载中…' : '暂无（会话未生成情绪分析或未授权）' }}</span>
        </el-descriptions-item>
        <el-descriptions-item v-if="emotionDetail?.suggestion" label="建议">
          {{ emotionDetail.suggestion }}
        </el-descriptions-item>
        <el-descriptions-item label="摘要">{{ activeConsult.summary }}</el-descriptions-item>
      </el-descriptions>
      <el-divider>对话消息</el-divider>
      <div v-loading="detailLoading" class="message-list">
        <el-empty v-if="!messages.length && !detailLoading" description="暂无对话消息" />
        <div v-for="item in messages" :key="item.id" class="message-item">
          <div class="message-item__meta">
            <span>{{ item.role || '消息' }}</span>
            <span>{{ item.time }}</span>
          </div>
          <p class="message-item__content">{{ item.content }}</p>
        </div>
      </div>
    </el-drawer>
  </el-card>
</template>

<style scoped>
.session-user {
  display: flex;
  align-items: center;
  gap: 10px;
}

.session-user__name {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.preview-block {
  line-height: 1.5;
}

.preview-line {
  font-size: 13px;
  color: var(--el-text-color-regular);
  margin-bottom: 4px;
}

.preview-snippet {
  font-size: 13px;
  color: var(--el-text-color-primary);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.pager-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.message-list {
  min-height: 120px;
}

.message-item {
  padding: 10px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.message-item__meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.message-item__content {
  margin: 0;
  line-height: 1.6;
  color: var(--el-text-color-primary);
  white-space: pre-wrap;
}

.emotion-score-hint {
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
