<script setup lang="ts">
import { computed } from 'vue'
import { Search } from '@element-plus/icons-vue'

export type TableSearchSelectOption = { label: string; value: string | number }

const props = withDefaults(
  defineProps<{
    /** 输入框，v-model */
    modelValue?: string
    inputLabel?: string
    placeholder?: string
    inputWidth?: string | number
    /** 下拉，v-model:selectValue */
    selectValue?: string | number | null
    selectLabel?: string
    selectOptions?: TableSearchSelectOption[]
    selectPlaceholder?: string
    selectWidth?: string | number
    selectClearable?: boolean
    loading?: boolean
    showReset?: boolean
    clearable?: boolean
    searchText?: string
    resetText?: string
  }>(),
  {
    modelValue: '',
    inputLabel: '关键词',
    placeholder: '请输入',
    inputWidth: 220,
    selectValue: null,
    selectLabel: '筛选',
    selectOptions: () => [],
    selectPlaceholder: '请选择',
    selectWidth: 160,
    selectClearable: true,
    loading: false,
    showReset: true,
    clearable: true,
    searchText: '搜索',
    resetText: '重置',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:selectValue': [value: string | number | null]
  search: []
  reset: []
}>()

const inputStyle = computed(() => {
  const w = props.inputWidth
  return { width: typeof w === 'number' ? `${w}px` : w }
})

const selectStyle = computed(() => {
  const w = props.selectWidth
  return { width: typeof w === 'number' ? `${w}px` : w }
})

const showSelect = computed(() => props.selectOptions.length > 0)

function onInput(v: string) {
  emit('update:modelValue', v)
}

function onSelect(v: string | number | null) {
  emit('update:selectValue', v)
}

function onSearch() {
  emit('search')
}

function onReset() {
  emit('update:modelValue', '')
  if (showSelect.value) emit('update:selectValue', null)
  emit('reset')
}
</script>

<template>
  <div class="table-search">
    <div class="table-search__fields">
      <div class="field">
        <span class="field__label">{{ inputLabel }}</span>
        <el-input
          :model-value="modelValue"
          :placeholder="placeholder"
          :style="inputStyle"
          :clearable="clearable"
          @update:model-value="onInput"
          @keyup.enter="onSearch"
        />
      </div>
      <div v-if="showSelect" class="field">
        <span class="field__label">{{ selectLabel }}</span>
        <el-select
          :model-value="selectValue"
          :placeholder="selectPlaceholder"
          :style="selectStyle"
          :clearable="selectClearable"
          @update:model-value="onSelect"
        >
          <el-option v-for="opt in selectOptions" :key="String(opt.value)" :label="opt.label" :value="opt.value" />
        </el-select>
      </div>
      <slot name="fields" />
    </div>
    <div class="table-search__actions">
      <el-button type="primary" :loading="loading" @click="onSearch">
        <el-icon class="btn-icon"><Search /></el-icon>
        {{ searchText }}
      </el-button>
      <el-button v-if="showReset" @click="onReset">{{ resetText }}</el-button>
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.table-search {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 16px;
  margin-bottom: 16px;
}

.table-search__fields {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 20px;
}

.field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field__label {
  flex-shrink: 0;
  font-size: 14px;
  color: var(--el-text-color-regular);
  white-space: nowrap;
}

.table-search__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.btn-icon {
  margin-right: 4px;
  vertical-align: middle;
}
</style>
