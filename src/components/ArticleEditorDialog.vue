<script setup lang="ts">
import '@wangeditor/editor/dist/css/style.css'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import type { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor'
import { computed, reactive, ref, shallowRef, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules, UploadRequestOptions } from 'element-plus'
import { uploadFile } from '@/api/admin'

export interface ArticleEditorForm {
  title: string
  category: string
  summary: string
  tags: string[]
  coverUrl: string
  content: string
}

export type ArticleEditorModel = Partial<Omit<ArticleEditorForm, 'tags'>> & {
  id?: number | string
  title?: string
  category?: string
  tags?: string | string[]
}

const emptyForm = (): ArticleEditorForm => ({
  title: '',
  category: '',
  summary: '',
  tags: [],
  coverUrl: '',
  content: '',
})

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    article?: ArticleEditorModel | null
    categoryOptions?: string[]
    tagOptions?: string[]
  }>(),
  {
    article: null,
    categoryOptions: () => [],
    tagOptions: () => [],
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [value: ArticleEditorForm]
}>()

const formRef = ref<FormInstance>()
const form = reactive<ArticleEditorForm>(emptyForm())
const editorRef = shallowRef<IDomEditor | undefined>(undefined)

const dialogTitle = computed(() => (props.article?.id ? '编辑文章' : '新增文章'))

const toolbarConfig: Partial<IToolbarConfig> = {
  toolbarKeys: [
    'bold',
    'italic',
    'underline',
    '|',
    'color',
    'bgColor',
    '|',
    'fontSize',
    'fontFamily',
    '|',
    'header1',
    'header2',
    'header3',
    '|',
    'bulletedList',
    'numberedList',
    '|',
    'blockquote',
    'insertLink',
    '|',
    'undo',
    'redo',
  ],
}

const editorConfig: Partial<IEditorConfig> = {
  placeholder:
    '请输入文章内容，支持富文本格式\n\n可以使用加粗、斜体、列表、标题等格式来丰富文章内容。',
}

const rules: FormRules<ArticleEditorForm> = {
  title: [{ required: true, message: '请输入文章标题', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  content: [
    {
      validator: (_rule, value, callback) => {
        const text = String(value ?? '')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .trim()
        if (!text) {
          callback(new Error('请输入文章内容'))
          return
        }
        callback()
      },
      trigger: 'blur',
    },
  ],
}

function parseTagsToArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((t) => String(t).trim()).filter(Boolean)
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

function fillForm() {
  const base = emptyForm()
  const a = props.article
  if (a) {
    Object.assign(form, {
      ...base,
      title: a.title ?? '',
      category: a.category ?? '',
      summary: a.summary ?? '',
      tags: parseTagsToArray(a.tags),
      coverUrl: a.coverUrl ?? '',
      content: a.content ?? '',
    })
  } else {
    Object.assign(form, base)
  }
}

function closeDialog() {
  emit('update:modelValue', false)
}

function pickUploadUrl(data: unknown): string {
  if (typeof data === 'string') return data.trim()
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>
    const raw = o.filePath 
    return String(raw ?? '').trim()
  }
  return ''
}

async function handleCoverUpload(options: UploadRequestOptions) {
  const file = options.file as File
  const businessId = props.article?.id ?? 0
  try {
    const res = await uploadFile(file, { businessId })
    const url = pickUploadUrl(res)
    if (!url) {
      throw new Error('未返回文件地址')
    }
    
    form.coverUrl = url
    options.onSuccess(res)
    ElMessage.success('封面上传成功')
  } catch (e: unknown) {
    options.onError(e as Parameters<NonNullable<UploadRequestOptions['onError']>>[0])
    ElMessage.error(e instanceof Error ? e.message : '封面上传失败')
  }
}

function handleCreated(editor: IDomEditor) {
  editorRef.value = editor
}

async function submitForm() {
  const ok = await formRef.value?.validate().catch(() => false)
  if (!ok) {
    ElMessage.warning('请完善文章信息')
    return
  }
  emit('save', { ...form })
  closeDialog()
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) fillForm()
  },
)
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    class="article-editor-dialog"
    :title="dialogTitle"
    width="720px"
    align-center
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
    @open="fillForm"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" label-position="right">
      <el-form-item label="文章标题" prop="title">
        <el-input
          v-model="form.title"
          maxlength="200"
          show-word-limit
          placeholder="请输入文章标题"
          clearable
        />
      </el-form-item>
      <el-form-item label="所属分类" prop="category">
        <el-select
          v-model="form.category"
          filterable
          allow-create
          default-first-option
          placeholder="请选择分类"
          style="width: 100%"
        >
          <el-option v-for="item in categoryOptions" :key="item" :label="item" :value="item" />
        </el-select>
      </el-form-item>
      <el-form-item label="文章摘要" prop="summary">
        <el-input
          v-model="form.summary"
          type="textarea"
          :rows="4"
          maxlength="1000"
          show-word-limit
          placeholder="请输入文章摘要(可选)"
        />
      </el-form-item>
      <el-form-item label="标签" prop="tags">
        <el-select
          v-model="form.tags"
          multiple
          filterable
          allow-create
          default-first-option
          collapse-tags
          collapse-tags-tooltip
          :max-collapse-tags="4"
          placeholder="请选择标签，可多选"
          style="width: 100%"
        >
          <el-option v-for="item in tagOptions" :key="item" :label="item" :value="item" />
        </el-select>
      </el-form-item>
      <el-form-item label="封面图片" prop="coverUrl">
        <el-upload
          class="cover-upload"
          :show-file-list="false"
          accept="image/*"
          :http-request="handleCoverUpload"
        >
          <div class="cover-upload__square">
            <template v-if="form.coverUrl">
              <img :src="form.coverUrl" alt="封面" class="cover-upload__preview" />
            </template>
            <div v-else class="cover-upload__placeholder">点击上传封面</div>
          </div>
        </el-upload>
      </el-form-item>
      <el-form-item label="文章内容" prop="content" class="form-item--editor">
        <div class="editor-shell">
          <Toolbar class="editor-shell__toolbar" :editor="editorRef" :default-config="toolbarConfig" mode="default" />
          <Editor
            v-model="form.content"
            class="editor-shell__editor"
            :default-config="editorConfig"
            mode="default"
            @on-created="handleCreated"
          />
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" @click="submitForm">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.article-editor-dialog :deep(.el-dialog__body) {
  padding-top: 8px;
  max-height: calc(100vh - 180px);
  overflow-y: auto;
}

.cover-upload :deep(.el-upload) {
  display: block;
  width: auto;
}

.cover-upload__square {
  width: 260px;
  height: 260px;
  flex-shrink: 0;
}

.cover-upload__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.cover-upload__placeholder:hover {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}

.cover-upload__preview {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 6px;
  cursor: pointer;
}

.form-item--editor :deep(.el-form-item__content) {
  display: block;
}

.editor-shell {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;
  background: var(--el-bg-color);
}

.editor-shell__toolbar {
  border-bottom: 1px solid var(--el-border-color);
}

.editor-shell__toolbar :deep(.w-e-bar) {
  padding: 2px 6px;
}

.editor-shell__toolbar :deep(.w-e-bar-item) {
  padding: 1px 3px;
  height: auto;
  min-height: 26px;
}

.editor-shell__toolbar :deep(.w-e-bar-item button) {
  padding: 2px 4px;
}

.editor-shell__toolbar :deep(svg) {
  width: 13px !important;
  height: 13px !important;
}

.editor-shell__toolbar :deep(.w-e-bar-divider) {
  margin: 0 2px;
  height: 18px;
}

.editor-shell__editor {
  height: 400px;
  overflow-y: hidden;
}
</style>
