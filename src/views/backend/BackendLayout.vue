<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DataAnalysis, Document, ChatLineRound, Memo } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import { ADMIN_PROFILE_CHANGED_EVENT, clearAdminSession, getAdminDisplayName } from '@/utils/auth'
import { logout } from '@/api/admin'

const route = useRoute()
const router = useRouter()

const menuItems = [
  { index: '/admin', label: '数据分析', icon: DataAnalysis },
  { index: '/admin/articles', label: '知识文章', icon: Document },
  { index: '/admin/consults', label: '咨询记录', icon: ChatLineRound },
  { index: '/admin/moods', label: '情绪日志', icon: Memo },
]

const pageTitle = computed(() => (route.meta.title as string | undefined) ?? '后台管理')
const adminDisplayName = ref(getAdminDisplayName())

const syncAdminDisplayName = () => {
  adminDisplayName.value = getAdminDisplayName()
}

const handleUserCommand = (command: string) => {
  if (command === 'profile') {
    router.push({ name: 'AdminProfile' })
    return
  }
  if (command === 'settings') {
    router.push({ name: 'AdminProfile' })
  }
}

const handleLogout = async () => {
  await logout().catch(() => null)
  clearAdminSession()
  ElMessage.success('已退出登录')
  router.push({ name: 'AuthLogin' })
}

onMounted(() => {
  window.addEventListener(ADMIN_PROFILE_CHANGED_EVENT, syncAdminDisplayName)
})

onBeforeUnmount(() => {
  window.removeEventListener(ADMIN_PROFILE_CHANGED_EVENT, syncAdminDisplayName)
})
</script>

<template>
  <div class="layout">
    <Sidebar :items="menuItems" />
    <div class="main">
      <Navbar :title="pageTitle" :username="adminDisplayName" @command="handleUserCommand" @logout="handleLogout" />
      <section class="content">
        <router-view />
      </section>
    </div>
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  background: var(--mh-page-bg, #f5f7fa);
}

.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.content {
  padding: 16px;
}
</style>
