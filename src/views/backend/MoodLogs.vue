<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHead from '@/components/PageHead.vue'
import TableSearch from '@/components/TableSearch.vue'
import { deleteEmotional, getEmotionalPage } from '@/api/admin'
import { formatDateTimeShort } from '@/utils/datetime'
import { getPageRecords } from '@/utils/apiPage'

interface MoodLog {
  id: number
  user: string
  mood: string
  score: number
  source: string
  createdAt: string
  note: string
}

const keyword = ref('')
const mood = ref<string | number | null>(null)
const detailVisible = ref(false)
const activeMood = ref<MoodLog | null>(null)
const loading = ref(false)
const allMoods = ref<MoodLog[]>([])

const moodOptions = computed(() =>
  Array.from(new Set(allMoods.value.map((item) => item.mood))).map((value) => ({ label: value, value })),
)

const moods = computed(() => allMoods.value)

function normalizeMoodLog(item: unknown): MoodLog {
  const row = item as Record<string, unknown>
  return {
    id: Number(row.id ?? row.diaryId),
    user: String(row.userName ?? row.nickname ?? row.username ?? row.userId ?? '匿名用户'),
    mood: String(row.mood ?? row.emotion ?? row.emotionType ?? '未知'),
    score: Number(row.score ?? row.emotionScore ?? row.moodScore ?? 0),
    source: String(row.source ?? row.recordSource ?? '情绪日志'),
    createdAt: formatDateTimeShort(row.createdAt ?? row.createTime ?? row.recordTime),
    note: String(row.note ?? row.content ?? row.description ?? ''),
  }
}

async function runSearch() {
  loading.value = true
  try {
    const data = await getEmotionalPage({
      pageNum: 1,
      pageSize: 50,
      keyword: keyword.value.trim() || undefined,
      mood: mood.value || undefined,
    })
    allMoods.value = getPageRecords(data).map(normalizeMoodLog).filter((item) => item.id)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '情绪日志加载失败')
  } finally {
    loading.value = false
  }
}

function onReset() {
  mood.value = null
  runSearch()
}

function getScoreStatus(score: number) {
  if (score >= 8) return 'success'
  if (score >= 6) return undefined
  return 'exception'
}

function openDetail(row: MoodLog) {
  activeMood.value = row
  detailVisible.value = true
}

async function handleDelete(row: MoodLog) {
  const confirmed = await ElMessageBox.confirm(`确认删除 ${row.user} 的情绪日志吗？`, '删除情绪日志', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    confirmButtonClass: 'el-button--danger',
    type: 'warning',
  }).catch(() => false)
  if (!confirmed) return

  try {
    await deleteEmotional(row.id)
    allMoods.value = allMoods.value.filter((item) => item.id !== row.id)
    ElMessage.success('情绪日志已删除')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '情绪日志删除失败')
  }
}

onMounted(runSearch)
</script>

<template>
  <el-card shadow="never">
    <template #header>
      <PageHead title="情绪日志" :show-add="false" />
    </template>

    <TableSearch
      v-model="keyword"
      v-model:select-value="mood"
      placeholder="搜索用户、情绪、来源或时间"
      select-label="情绪"
      :select-options="moodOptions"
      select-placeholder="全部情绪"
      @search="runSearch"
      @reset="onReset"
    />

    <el-table v-loading="loading" :data="moods">
      <el-table-column prop="user" label="用户" width="120" />
      <el-table-column prop="mood" label="情绪" width="120" />
      <el-table-column label="评分" min-width="220">
        <template #default="{ row }">
          <el-progress :percentage="row.score * 10" :status="getScoreStatus(row.score)" />
        </template>
      </el-table-column>
      <el-table-column prop="source" label="来源" width="140" />
      <el-table-column prop="createdAt" label="记录时间" width="180" />
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row)">详情</el-button>
          <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-drawer v-model="detailVisible" title="情绪日志详情" size="420px">
      <el-descriptions v-if="activeMood" :column="1" border>
        <el-descriptions-item label="用户">{{ activeMood.user }}</el-descriptions-item>
        <el-descriptions-item label="情绪">{{ activeMood.mood }}</el-descriptions-item>
        <el-descriptions-item label="评分">{{ activeMood.score }}/10</el-descriptions-item>
        <el-descriptions-item label="来源">{{ activeMood.source }}</el-descriptions-item>
        <el-descriptions-item label="记录时间">{{ activeMood.createdAt }}</el-descriptions-item>
        <el-descriptions-item label="备注">{{ activeMood.note }}</el-descriptions-item>
      </el-descriptions>
    </el-drawer>
  </el-card>
</template>
