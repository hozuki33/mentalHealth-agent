<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ChatDotRound, DataLine, Notebook, User } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getAnalyticsOverview } from '@/api/admin'

interface OverviewCard {
  title: string
  value: string | number
  subText: string
  icon: typeof User
  color: string
}

interface TrendItem {
  date: string
  score: number
  records: number
}

interface StatItem {
  label: string
  value: string | number
}

interface ActiveItem {
  label: string
  value: number
}

/** 首屏不展示占位假数据，避免接口返回前/后数值跳变 */
const loading = ref(true)
const overviewCards = ref<OverviewCard[]>([])
const emotionTrend = ref<TrendItem[]>([])
const sessionStats = ref<StatItem[]>([])
const activeTrend = ref<ActiveItem[]>([])

function toNumber(value: unknown, fallback = 0) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

function normalizeTrend(items: unknown): TrendItem[] {
  if (!Array.isArray(items)) return []
  return items.map((item) => {
    const row = item as Record<string, unknown>
    return {
      date: String(row.date ?? row.day ?? row.time ?? ''),
      score: toNumber(row.score ?? row.averageScore ?? row.avgScore),
      records: toNumber(row.records ?? row.count),
    }
  })
}

function normalizeActiveTrend(items: unknown): ActiveItem[] {
  if (!Array.isArray(items)) return []
  return items.map((item) => {
    const row = item as Record<string, unknown>
    return {
      label: String(row.label ?? row.weekday ?? row.date ?? ''),
      value: Math.min(toNumber(row.value ?? row.rate ?? row.count), 1),
    }
  })
}

async function loadOverview() {
  loading.value = true
  try {
    const data = (await getAnalyticsOverview()) as Record<string, unknown>
    const totalUsers = toNumber(data.totalUsers ?? data.userCount, 0)
    const activeUsers = toNumber(data.activeUsers ?? data.activeUserCount, 0)
    const moodLogs = toNumber(data.moodLogs ?? data.emotionDiaryCount, 0)
    const todayMoodLogs = toNumber(data.todayMoodLogs ?? data.todayEmotionDiaryCount, 0)
    const sessions = toNumber(data.sessions ?? data.sessionCount, 0)
    const todaySessions = toNumber(data.todaySessions ?? data.todaySessionCount, 0)
    const averageMood = toNumber(data.averageMood ?? data.averageEmotionScore, 0)

    overviewCards.value = [
      { title: '总用户数', value: totalUsers, subText: `活跃用户: ${activeUsers}`, icon: User, color: '#6366f1' },
      { title: '情绪日志', value: moodLogs, subText: `今日新增: ${todayMoodLogs}`, icon: Notebook, color: '#ec4899' },
      { title: '咨询会话', value: sessions, subText: `今日新增: ${todaySessions}`, icon: ChatDotRound, color: '#0ea5e9' },
      { title: '平均情绪', value: `${averageMood.toFixed(1)}/10`, subText: '综合情绪评分', icon: DataLine, color: '#22c55e' },
    ]

    const trendRaw = normalizeTrend(data.emotionTrend ?? data.moodTrend)
    emotionTrend.value = trendRaw.length ? trendRaw : []

    sessionStats.value = [
      { label: '总会话数', value: sessions },
      { label: '平均时长', value: `${toNumber(data.averageSessionMinutes ?? data.avgDurationMinutes, 0).toFixed(1)} 分钟` },
      { label: '活跃用户', value: activeUsers },
    ]

    const activeRaw = normalizeActiveTrend(data.activeTrend ?? data.userActiveTrend)
    activeTrend.value = activeRaw.length ? activeRaw : []
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '数据分析加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadOverview)
</script>

<template>
  <div class="dashboard">
    <el-row v-loading="loading" :gutter="16">
      <el-col v-for="item in overviewCards" :key="item.title" :xs="24" :sm="12" :md="12" :lg="6">
        <el-card shadow="never" class="overview-card">
          <div class="overview-content">
            <div class="overview-icon" :style="{ backgroundColor: item.color }">
              <el-icon :size="20"><component :is="item.icon" /></el-icon>
            </div>
            <div>
              <p class="overview-title">{{ item.title }}</p>
              <p class="overview-value">{{ item.value }}</p>
              <p class="overview-sub">{{ item.subText }}</p>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="chart-row">
      <el-col :xs="24" :lg="14">
        <el-card shadow="never" class="panel-card">
          <template #header>情绪趋势分析</template>
          <div class="trend-list">
            <div v-for="item in emotionTrend" :key="item.date" class="trend-item">
              <span class="trend-date">{{ item.date }}</span>
              <el-progress :percentage="item.score * 10" :stroke-width="10" :show-text="false" />
              <span class="trend-label">{{ item.score.toFixed(1) }}</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="10">
        <el-card shadow="never" class="panel-card">
          <template #header>咨询会话统计</template>
          <div class="stats-box">
            <div v-for="item in sessionStats" :key="item.label" class="stats-item">
              <p class="stats-label">{{ item.label }}</p>
              <p class="stats-value">{{ item.value }}</p>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="panel-card">
      <template #header>用户活跃度趋势</template>
      <div class="active-bars">
        <div v-for="item in activeTrend" :key="item.label" class="bar-item">
          <div class="bar-track">
            <div class="bar-fill" :style="{ height: `${item.value * 100}%` }"></div>
          </div>
          <p class="bar-label">{{ item.label }}</p>
        </div>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.overview-card {
  border-radius: 12px;
}

.overview-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.overview-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  color: #fff;
}

.overview-title {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.overview-value {
  margin: 4px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.overview-sub {
  margin: 0;
  font-size: 12px;
  color: #a8abb2;
}

.chart-row {
  margin-top: 0;
}

.panel-card {
  border-radius: 12px;
}

.trend-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.trend-item {
  display: grid;
  grid-template-columns: 90px 1fr 40px;
  align-items: center;
  gap: 10px;
}

.trend-date,
.trend-label {
  font-size: 12px;
  color: #606266;
}

.stats-box {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.stats-item {
  text-align: center;
  padding: 12px 8px;
  border-radius: 10px;
  background: #f7f9fc;
}

.stats-label {
  margin: 0;
  color: #909399;
  font-size: 12px;
}

.stats-value {
  margin: 6px 0 0;
  color: #303133;
  font-weight: 600;
}

.active-bars {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 12px;
  height: 220px;
  align-items: end;
}

.bar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.bar-track {
  width: 22px;
  height: 170px;
  border-radius: 999px;
  background: #edf1f7;
  display: flex;
  align-items: end;
  overflow: hidden;
}

.bar-fill {
  width: 100%;
  background: linear-gradient(180deg, #60a5fa, #2563eb);
  border-radius: 999px;
}

.bar-label {
  margin: 0;
  font-size: 12px;
  color: #606266;
}
</style>
