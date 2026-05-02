<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { Check, Coffee, Moon, PartlyCloudy, Tools } from '@element-plus/icons-vue'
import { THEME_OPTIONS, type ThemeId } from '@/constants/theme'
import { useThemeStore } from '@/stores/theme'

const props = withDefaults(
  defineProps<{
    /** navbar：图标按钮；header：带文案按钮 */
    placement?: 'navbar' | 'header'
  }>(),
  { placement: 'navbar' },
)

const themeStore = useThemeStore()
const { theme } = storeToRefs(themeStore)

function iconFor(id: ThemeId) {
  if (id === 'light') return PartlyCloudy
  if (id === 'warm') return Coffee
  return Moon
}

const currentLabel = computed(() => THEME_OPTIONS.find((o) => o.id === theme.value)?.label ?? '主题')

function onCommand(cmd: string | number | object) {
  const id = String(cmd) as ThemeId
  if (id === 'light' || id === 'warm' || id === 'dark') themeStore.setTheme(id)
}
</script>

<template>
  <el-dropdown trigger="click" teleported @command="onCommand">
    <el-button
      :text="placement === 'navbar'"
      :class="placement === 'navbar' ? 'theme-trigger--navbar' : 'theme-trigger--header'"
      :aria-label="`当前主题：${currentLabel}，点击切换`"
    >
      <span class="theme-trigger__inner">
        <el-icon :size="placement === 'navbar' ? 20 : 18"><Tools /></el-icon>
        <span v-if="placement === 'header'" class="theme-trigger__text">{{ currentLabel }}</span>
      </span>
    </el-button>
    <template #dropdown>
      <el-dropdown-menu class="theme-menu">
        <el-dropdown-item v-for="opt in THEME_OPTIONS" :key="opt.id" :command="opt.id">
          <span class="theme-menu__row">
            <el-icon class="theme-menu__icon"><component :is="iconFor(opt.id)" /></el-icon>
            <span class="theme-menu__main">
              <span class="theme-menu__label">{{ opt.label }}</span>
              <span class="theme-menu__hint">{{ opt.hint }}</span>
            </span>
            <el-icon v-if="theme === opt.id" class="theme-menu__check"><Check /></el-icon>
          </span>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<style scoped>
.theme-trigger__inner {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.theme-trigger--navbar {
  padding: 8px;
  margin-right: 8px;
  color: var(--mh-text-secondary, #6b7280);
}

.theme-trigger--navbar:hover {
  color: var(--mh-accent, #409eff);
}

.theme-trigger--header {
  padding: 8px 14px;
  font-size: 15px;
  border-radius: 8px;
  color: var(--fe-text-muted, #5c5348);
  border: 1px solid var(--fe-btn-outline-border, rgba(74, 64, 52, 0.18));
  background: var(--fe-btn-outline-bg, rgba(255, 253, 248, 0.85));
}

.theme-trigger--header:hover {
  color: var(--fe-accent, #3d7d6d);
  border-color: var(--fe-accent, #3d7d6d);
}

.theme-trigger__text {
  font-weight: 600;
}

.theme-menu__row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 220px;
  padding: 2px 0;
}

.theme-menu__icon {
  margin-top: 2px;
  flex-shrink: 0;
  color: var(--el-text-color-secondary);
}

.theme-menu__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.theme-menu__label {
  font-weight: 600;
  font-size: 14px;
}

.theme-menu__hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.35;
}

.theme-menu__check {
  flex-shrink: 0;
  color: var(--el-color-primary);
  margin-top: 2px;
}
</style>
