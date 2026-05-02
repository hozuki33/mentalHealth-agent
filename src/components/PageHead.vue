<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    /** 右侧主按钮文案，默认「新增」 */
    addText?: string
    showAdd?: boolean
  }>(),
  {
    addText: '新增',
    showAdd: true,
  },
)

const emit = defineEmits<{
  add: []
}>()
</script>

<template>
  <div class="page-head">
    <h2 class="page-head__title">{{ title }}</h2>
    <div class="page-head__actions">
      <slot name="extra" />
      <el-button v-if="showAdd" type="primary" @click="emit('add')">{{ addText }}</el-button>
    </div>
  </div>
</template>

<style scoped>
.page-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.page-head__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.4;
}

.page-head__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}
</style>
