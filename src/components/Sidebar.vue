<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import type { Component } from 'vue'
import { useLayoutStore } from '@/stores/layout'

const iconUrl = new URL('../assets/images/机器人.png', import.meta.url).href

interface MenuItem {
  index: string
  label: string
  icon?: Component
}

interface Props {
  /** 品牌主标题 */
  title?: string
  /** 品牌副标题 */
  subtitle?: string
  items: MenuItem[]
}

const props = withDefaults(defineProps<Props>(), {
  title: '心理健康AI助手',
  subtitle: '管理后台',
})

const route = useRoute()
const layoutStore = useLayoutStore()
const { sidebarCollapsed: collapsed } = storeToRefs(layoutStore)

const currentActive = computed(() => route.path)
</script>

<template>
  <el-aside ref="asideRef" :width="collapsed ? '64px' : '264px'" class="sidebar-aside">
    <el-menu
      router
      :default-active="currentActive"
      class="menu-style"
      :collapse="collapsed"
      :collapse-transition="false"
    >
      <div ref="brandRef" class="brand" :class="{ 'brand--collapsed': collapsed }">
        <el-image ref="logoRef" class="brand-logo" :src="iconUrl" alt="logo" fit="contain" />
        <div ref="infoRef" class="info-card" :aria-hidden="collapsed">
          <h1 class="brand-title">{{ props.title }}</h1>
          <p class="brand-subtitle">{{ props.subtitle }}</p>
        </div>
      </div>

      <el-menu-item v-for="item in items" :key="item.index" :index="item.index">
        <el-icon v-if="item.icon">
          <component :is="item.icon" />
        </el-icon>
        <template #title>{{ item.label }}</template>
      </el-menu-item>
    </el-menu>
  </el-aside>
</template>

<style scoped>
.sidebar-aside {
  flex-shrink: 0;
  min-height: 100vh;
  overflow: hidden;
  background-color: var(--mh-sidebar-bg, #fff);
  border-right: 1px solid var(--mh-border, #e5e7eb);
  transition:
    width 0.28s cubic-bezier(0.4, 0, 0.2, 1),
    border-color 0.2s ease;
}

.menu-style {
  height: 100%;
  min-height: 100vh;
  border-right: none;
}

.menu-style :deep(.el-menu--vertical:not(.el-menu--collapse) > .el-menu-item) {
  justify-content: center;
  padding-left: 20px !important;
  padding-right: 20px !important;
}

.menu-style :deep(.el-menu--vertical:not(.el-menu--collapse) > .el-menu-item .el-icon) {
  margin-right: 6px;
  margin-left: 0;
}

.brand {
  box-sizing: border-box;
  height: 74px;
  position: relative;
  padding: 0;
  background-color: var(--mh-sidebar-bg, #fff);
  border-bottom: 1px solid var(--mh-sidebar-brand-border, #e5e7eb);
  overflow: hidden;
}

.brand-logo {
  display: block;
  position: absolute;
  top: 12px;
  left: 10px;
  width: 50px;
  height: 50px;
  min-width: 50px;
  max-width: 50px;
  margin: 0;
  transition: left 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.brand-logo :deep(img) {
  display: block;
  width: 50px;
  height: 50px;
}

.brand--collapsed .brand-logo {
  left: 7px;
}

.info-card {
  position: absolute;
  top: 14px;
  left: 70px;
  width: 164px;
  max-width: 164px;
  overflow: hidden;
  opacity: 1;
  transform: translateX(0);
  transition:
    width 0.28s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.18s ease 0.1s,
    transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.brand--collapsed .info-card {
  width: 0;
  opacity: 0;
  transform: translateX(-6px);
  transition:
    width 0.28s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.1s ease,
    transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.brand-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 5px;
  line-height: 1.25;
  color: var(--mh-brand-title, #1f2973);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.brand-subtitle {
  margin: 0;
  font-size: 14px;
  line-height: 1.3;
  color: var(--mh-brand-sub, #6b7280);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
