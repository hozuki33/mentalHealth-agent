<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { addEmotionDiary } from '@/api/frontend'

const moodOptions = ['平静', '开心', '焦虑', '低落', '疲惫', '压力大']

const form = reactive({
  mood: '平静',
  content: '',
})

const saving = ref(false)

async function submit() {
  if (!form.content.trim()) {
    ElMessage.warning('请简单写几句今天的心情或想记录的话')
    return
  }
  saving.value = true
  try {
    await addEmotionDiary({
      mood: form.mood,
      emotion: form.mood,
      content: form.content.trim(),
    })
    ElMessage.success('已保存情绪日记')
    form.content = ''
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="page">
    <div class="inner">
      <h1 class="title">情绪日记</h1>
      <p class="lead">用几句话记录当下感受，帮助您梳理情绪、看见变化。</p>

      <el-card class="panel" shadow="never">
        <el-form label-position="top" @submit.prevent>
          <el-form-item label="当前情绪">
            <el-select v-model="form.mood" placeholder="选择情绪" style="width: 100%">
              <el-option v-for="m in moodOptions" :key="m" :label="m" :value="m" />
            </el-select>
          </el-form-item>
          <el-form-item label="想说的话">
            <el-input
              v-model="form.content"
              type="textarea"
              :rows="6"
              maxlength="2000"
              show-word-limit
              placeholder="例如：今天工作压力大，晚上散步后好一些……"
            />
          </el-form-item>
          <el-button type="primary" :loading="saving" @click="submit">保存日记</el-button>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 32px 24px 48px;
}

.inner {
  max-width: 560px;
  margin: 0 auto;
}

.title {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 700;
  color: var(--fe-text, #3a3530);
}

.lead {
  margin: 0 0 24px;
  color: var(--fe-text-muted, #5c5348);
  line-height: 1.6;
}

.panel {
  border-radius: 12px;
}
</style>
