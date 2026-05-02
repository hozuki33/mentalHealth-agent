<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getKnowledgeDetail, getKnowledgeList } from '@/api/frontend'
import { getPageRecords } from '@/utils/apiPage'

interface ArticleItem {
  id: string | number
  title: string
  summary: string
  category: string
}

const loading = ref(false)
const articles = ref<ArticleItem[]>([])
const detailOpen = ref(false)
const detailLoading = ref(false)
const detailTitle = ref('')
const detailHtml = ref('')

function normalizeArticle(item: unknown, index: number): ArticleItem {
  const row = (item ?? {}) as Record<string, unknown>
  return {
    id: (row.id ?? row.articleId ?? index) as string | number,
    title: String(row.title ?? row.name ?? `文章 ${index + 1}`),
    summary: String(row.summary ?? row.description ?? '').slice(0, 200),
    category: String(row.categoryName ?? row.category ?? '心理知识'),
  }
}

async function loadList() {
  loading.value = true
  try {
    const data = await getKnowledgeList({ pageNum: 1, pageSize: 50 })
    articles.value = getPageRecords(data).map(normalizeArticle)
  } catch (error) {
    articles.value = []
    ElMessage.error(error instanceof Error ? error.message : '加载失败')
  } finally {
    loading.value = false
  }
}

async function openDetail(row: ArticleItem) {
  detailTitle.value = row.title
  detailHtml.value = ''
  detailOpen.value = true
  detailLoading.value = true
  try {
    const data = (await getKnowledgeDetail(row.id)) as Record<string, unknown>
    const content = data.content ?? data.articleContent ?? data.body ?? data.summary ?? row.summary
    detailHtml.value = String(content ?? '')
  } catch (error) {
    detailHtml.value = `<p>${row.summary || '暂无正文'}</p>`
    ElMessage.error(error instanceof Error ? error.message : '详情加载失败')
  } finally {
    detailLoading.value = false
  }
}

onMounted(() => {
  loadList()
})
</script>

<template>
  <div class="page">
    <div class="inner">
      <h1 class="title">知识库</h1>
      <p class="lead">精选心理健康科普与自助文章，供您随时查阅。</p>

      <div v-loading="loading" class="list">
        <el-empty v-if="!articles.length && !loading" description="暂无文章" />
        <article
          v-for="item in articles"
          :key="item.id"
          class="card"
          role="button"
          tabindex="0"
          @click="openDetail(item)"
          @keydown.enter.prevent="openDetail(item)"
        >
          <el-tag size="small" effect="plain" class="tag">{{ item.category }}</el-tag>
          <h2>{{ item.title }}</h2>
          <p v-if="item.summary" class="summary">{{ item.summary }}</p>
        </article>
      </div>
    </div>

    <el-dialog v-model="detailOpen" :title="detailTitle" width="min(720px, 92vw)" destroy-on-close>
      <div v-loading="detailLoading" class="detail-body" v-html="detailHtml" />
    </el-dialog>
  </div>
</template>

<style scoped>
.page {
  padding: 32px 24px 48px;
}

.inner {
  max-width: 900px;
  margin: 0 auto;
}

.title {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 700;
  color: var(--fe-text, #3a3530);
}

.lead {
  margin: 0 0 28px;
  color: var(--fe-text-muted, #5c5348);
  line-height: 1.6;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 120px;
}

.card {
  padding: 20px 22px;
  background: var(--chat-card-bg, #fff9f2);
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(61, 52, 41, 0.06);
  cursor: pointer;
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
  border: 1px solid rgba(74, 64, 52, 0.06);
}

.card:hover,
.card:focus {
  outline: none;
  border-color: rgba(61, 125, 109, 0.35);
  box-shadow: 0 4px 16px rgba(61, 125, 109, 0.12);
}

.tag {
  margin-bottom: 10px;
}

.card h2 {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: var(--fe-text, #3a3530);
}

.summary {
  margin: 0;
  font-size: 14px;
  color: var(--fe-text-muted, #5c5348);
  line-height: 1.65;
}

.detail-body {
  min-height: 80px;
  line-height: 1.75;
  color: var(--fe-text, #3a3530);
}
</style>
