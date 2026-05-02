<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import ArticleEditorDialog from '@/components/ArticleEditorDialog.vue'
import PageHead from '@/components/PageHead.vue'
import TableSearch from '@/components/TableSearch.vue'
import {
  articlePage,
  articleTagList,
  categoryTree,
  changeArticleStatus,
  createArticle,
  deleteArticle,
  getArticleDetail,
  updateArticle,
} from '@/api/admin'
import type { ArticleEditorForm } from '@/components/ArticleEditorDialog.vue'
import { getPageRecords } from '@/utils/apiPage'

const keyword = ref('')
const category = ref('')
const status = ref('')
const editorVisible = ref(false)
const editingArticle = ref<Article | null>(null)
const loading = ref(false)
const categories = ref<string[]>([])
const tagsFromApi = ref<string[]>([])

interface Article {
  id: number | string
  title: string
  category: string
  status: string
  updatedAt: string
  summary?: string
  tags?: string
  coverUrl?: string
  content?: string
  raw?: Record<string, unknown>
}

const allArticles = ref<Article[]>([])
const defaultStatusOptions = ['已发布', '草稿', '已下线']

const categoryOptions = computed(() =>
  Array.from(new Set([...categories.value, ...allArticles.value.map((item) => item.category)].filter(Boolean))).map((value) => ({
    label: value,
    value,
  })),
)

const statusOptions = computed(() => defaultStatusOptions.map((value) => ({ label: value, value })))

const categoryNames = computed(() => categoryOptions.value.map((item) => item.value))

const tagOptionsList = computed(() => {
  const fromRows = allArticles.value.flatMap((item) =>
    item.tags
      ? item.tags
          .split(/[,，]/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
  )
  return Array.from(new Set([...tagsFromApi.value, ...fromRows].filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'zh-CN'),
  )
})

const articles = computed(() => allArticles.value)

function resolveArticleId(row: Record<string, unknown>): number | string | undefined {
  const raw = row.id ?? row.articleId ?? row.knowledgeArticleId ?? row.knowledgeId
  if (raw === undefined || raw === null) return undefined
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  const s = String(raw).trim()
  if (!s) return undefined
  const n = Number(s)
  if (Number.isFinite(n) && s === String(n)) return n
  return s
}

function formatDate(value: unknown) {
  if (!value) return ''
  return String(value).replace('T', ' ').slice(0, 10)
}

function normalizeStatus(value: unknown) {
  const statusValue = String(value ?? '').toLowerCase()
  if (['1', 'published', 'publish', '已发布'].includes(statusValue)) return '已发布'
  if (['2', 'offline', 'disabled', '已下线'].includes(statusValue)) return '已下线'
  return '草稿'
}

function toApiStatus(value: string) {
  if (value === '已发布') return 'PUBLISHED'
  if (value === '已下线') return 'OFFLINE'
  return 'DRAFT'
}

function normalizeArticle(item: unknown): Article | null {
  const row = item as Record<string, unknown>
  const id = resolveArticleId(row)
  if (id === undefined) return null
  return {
    id,
    title: String(row.title ?? ''),
    category: String(row.categoryName ?? row.category ?? row.categoryTitle ?? ''),
    status: normalizeStatus(row.status),
    updatedAt: formatDate(row.updatedAt ?? row.updateTime ?? row.modifiedAt ?? row.createTime),
    tags: normalizeTags(row.tags ?? row.tagList ?? row.tagNames),
    raw: row,
  }
}

function normalizeTags(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((t) => String(t)).filter(Boolean).join(',')
  }
  return String(value ?? '')
}

function normalizeArticleDetail(data: unknown, row: Article): Article {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>
  const base = normalizeArticle({ ...d, id: row.id }) ?? row
  return {
    ...base,
    summary: String(d.summary ?? d.abstract ?? d.description ?? ''),
    tags: normalizeTags(d.tags ?? d.tagList ?? d.tagNames),
    coverUrl: String(d.coverUrl ?? d.cover ?? d.coverImage ?? ''),
    content: String(d.content ?? d.body ?? d.htmlContent ?? d.articleContent ?? ''),
  }
}

function flattenCategories(nodes: unknown): string[] {
  if (!Array.isArray(nodes)) return []
  return nodes.flatMap((item) => {
    const row = item as Record<string, unknown>
    const name = row.name ?? row.categoryName ?? row.title
    return [...(name ? [String(name)] : []), ...flattenCategories(row.children)]
  })
}

function flattenTagList(data: unknown): string[] {
  if (data == null) return []
  if (Array.isArray(data)) {
    return data
      .flatMap((item) => {
        if (typeof item === 'string') return [item.trim()].filter(Boolean)
        const row = item as Record<string, unknown>
        const label = row.name ?? row.tagName ?? row.label ?? row.title ?? row.value
        return label ? [String(label).trim()] : []
      })
      .filter(Boolean)
  }
  const obj = data as Record<string, unknown>
  const nested = obj.records ?? obj.list ?? obj.rows ?? obj.data ?? obj.content
  if (nested !== undefined && nested !== data) {
    return flattenTagList(nested)
  }
  return []
}

async function loadCategories() {
  const data = await categoryTree().catch(() => [])
  categories.value = flattenCategories(data)
}

async function loadTags() {
  try {
    const data = await articleTagList()
    tagsFromApi.value = flattenTagList(data)
  } catch {
    tagsFromApi.value = []
  }
}

async function runSearch() {
  loading.value = true
  try {
    const data = await articlePage({
      pageNum: 1,
      pageSize: 50,
      keyword: keyword.value.trim() || undefined,
      categoryName: category.value || undefined,
      status: status.value ? toApiStatus(status.value) : undefined,
    })
    allArticles.value = getPageRecords(data)
      .map(normalizeArticle)
      .filter((item): item is Article => item !== null)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '文章列表加载失败')
  } finally {
    loading.value = false
  }
}

function onReset() {
  category.value = ''
  status.value = ''
  runSearch()
}

function openCreateDialog() {
  editingArticle.value = null
  editorVisible.value = true
}

async function handleEdit(row: Article) {
  try {
    const data = await getArticleDetail(row.id)
    editingArticle.value = normalizeArticleDetail(data, row)
  } catch (error) {
    ElMessage.warning(error instanceof Error ? error.message : '文章详情加载失败，已使用列表数据')
    editingArticle.value = { ...row }
  }
  editorVisible.value = true
}

async function handleSave(article: ArticleEditorForm) {
  const payload = {
    ...(editingArticle.value?.raw ?? {}),
    title: article.title,
    category: article.category,
    categoryName: article.category,
    status: toApiStatus(editingArticle.value?.status ?? '草稿'),
    summary: article.summary,
    tags: article.tags.length ? article.tags.join(',') : '',
    coverUrl: article.coverUrl,
    content: article.content,
  }

  try {
    if (!editingArticle.value) {
      await createArticle(payload)
      ElMessage.success('文章已新增')
    } else {
      await updateArticle(editingArticle.value.id, payload)
      ElMessage.success('文章已更新')
    }
    runSearch()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '文章保存失败')
  }
}

function getStatusType(status: string) {
  if (status === '已发布') return 'success'
  if (status === '已下线') return 'info'
  return 'warning'
}

async function handleToggleStatus(row: Article) {
  const nextStatus = row.status === '已发布' ? '已下线' : '已发布'
  try {
    await changeArticleStatus(row.id, { status: toApiStatus(nextStatus) })
    row.status = nextStatus
    row.updatedAt = new Date().toISOString().slice(0, 10)
    ElMessage.success(nextStatus === '已发布' ? '文章已发布' : '文章已下线')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '文章状态更新失败')
  }
}

async function handleDelete(row: Article) {
  const confirmed = await ElMessageBox.confirm(`确认删除文章「${row.title}」吗？删除后将无法在列表中恢复。`, '删除文章', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    confirmButtonClass: 'el-button--danger',
    type: 'warning',
  }).catch(() => false)
  if (!confirmed) return

  try {
    await deleteArticle(row.id)
    allArticles.value = allArticles.value.filter((item) => item.id !== row.id)
    ElMessage.success('文章已删除')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '文章删除失败')
  }
}

onMounted(() => {
  loadCategories()
  loadTags()
  runSearch()
})
</script>

<template>
  <el-card shadow="never">
    <template #header>
      <PageHead title="知识文章管理" add-text="新增文章" @add="openCreateDialog" />
    </template>

    <TableSearch v-model="keyword" placeholder="搜索标题、分类或状态" @search="runSearch" @reset="onReset">
      <template #fields>
        <div class="filter-field">
          <span class="filter-field__label">分类</span>
          <el-select v-model="category" clearable placeholder="全部分类" class="filter-field__select">
            <el-option v-for="item in categoryOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </div>
        <div class="filter-field">
          <span class="filter-field__label">状态</span>
          <el-select v-model="status" clearable placeholder="全部状态" class="filter-field__select">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </div>
      </template>
    </TableSearch>

    <el-table v-loading="loading" :data="articles">
      <el-table-column prop="title" label="标题" min-width="240" />
      <el-table-column prop="category" label="分类" width="140" />
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="updatedAt" label="更新时间" width="140" />
      <el-table-column label="操作" width="230" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
          <el-button link type="primary" @click="handleToggleStatus(row)">
            {{ row.status === '已发布' ? '下线' : '发布' }}
          </el-button>
          <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <ArticleEditorDialog
      v-model="editorVisible"
      :article="editingArticle"
      :category-options="categoryNames"
      :tag-options="tagOptionsList"
      @save="handleSave"
    />
  </el-card>
</template>

<style scoped>
.filter-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-field__label {
  flex-shrink: 0;
  font-size: 14px;
  color: var(--el-text-color-regular);
  white-space: nowrap;
}

.filter-field__select {
  width: 150px;
}
</style>
