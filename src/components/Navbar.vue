<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ArrowDown, Expand, Fold } from '@element-plus/icons-vue'
import ThemeSwitcher from '@/components/ThemeSwitcher.vue'
import { useLayoutStore } from '@/stores/layout'

interface Props {
  title?: string
  username?: string
}

withDefaults(defineProps<Props>(), {
  title: '数据分析',
  username: 'admin',
})

const layoutStore = useLayoutStore()
const { sidebarCollapsed: collapsed } = storeToRefs(layoutStore)

const emit = defineEmits<{
  command: [command: string]
  logout: []
}>()

const handleCommand = (command: string | number | object) => {
  const action = String(command)
  emit('command', action)
  if (action === 'logout') emit('logout')
}

const handleToggleCollapse = () => {
  layoutStore.toggleSidebar()
}
</script>

<template>
  <header class="navbar">
    <div class="flex-box">
      <el-button class="collapse-trigger" @click="handleToggleCollapse">
        <el-icon :size="18">
          <Expand v-if="collapsed" />
          <Fold v-else />
        </el-icon>
      </el-button>
      <slot name="left">
        <p class="page-title">{{ title }}</p>
      </slot>
    </div>

    <div class="flex-box navbar__right">
      <ThemeSwitcher placement="navbar" />
      <slot name="right">
        <el-dropdown trigger="hover" @command="handleCommand">
          <div class="user-entry flex-box">
            <el-avatar :size="36" src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png" />
            <p class="user-name">{{ username }}</p>
            <el-icon class="arrow"><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">个人中心</el-dropdown-item>
              <el-dropdown-item command="settings">账号设置</el-dropdown-item>
              <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </slot>
    </div>
  </header>
</template>

<style scoped>
.navbar {
  flex-shrink: 0;
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 15px;
  background: var(--mh-nav-bg, #fff);
  box-shadow: var(--mh-nav-shadow, 0 1px 4px rgba(0, 21, 41, 0.08));
}

.navbar__right {
  gap: 4px;
}

.flex-box {
  display: flex;
  align-items: center;
}

.page-title {
  margin: 0 0 0 20px;
  font-size: 26px;
  font-weight: 700;
  color: var(--mh-nav-title, #1f2937);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.collapse-trigger {
  flex-shrink: 0;
}

.user-entry {
  gap: 8px;
  padding: 6px 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.user-entry:hover {
  background-color: var(--mh-nav-hover, #f5f7fa);
}

.user-name {
  margin: 0 5px;
  font-size: 14px;
  font-weight: 700;
  color: var(--mh-text, #374151);
}

.arrow {
  color: var(--mh-text-secondary, #909399);
}
</style>
