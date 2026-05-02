<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import ThemeSwitcher from '@/components/ThemeSwitcher.vue'
import { ADMIN_PROFILE_CHANGED_EVENT, clearAdminSession, isAdminLoggedIn } from '@/utils/auth'

const route = useRoute()
const router = useRouter()
const loggedIn = ref(false)

function syncAuth() {
  loggedIn.value = isAdminLoggedIn()
}

function logout() {
  clearAdminSession()
  syncAuth()
  if (route.path.startsWith('/chat') || route.path === '/diary') {
    router.push('/auth/login')
  } else {
    router.push('/')
  }
}

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path === path || route.path.startsWith(`${path}/`)
}

onMounted(() => {
  syncAuth()
  window.addEventListener(ADMIN_PROFILE_CHANGED_EVENT, syncAuth)
})

onUnmounted(() => {
  window.removeEventListener(ADMIN_PROFILE_CHANGED_EVENT, syncAuth)
})
</script>

<template>
  <header class="site-header">
    <div class="site-header__inner">
    <RouterLink to="/" class="brand" aria-label="首页">
      <svg class="robot-icon" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="14" y="18" width="36" height="32" rx="6" fill="none" stroke="currentColor" stroke-width="2.5" />
        <circle cx="26" cy="32" r="3.5" fill="currentColor" />
        <circle cx="38" cy="32" r="3.5" fill="currentColor" />
        <path d="M24 42h16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
        <path d="M32 18V10M24 10h16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
        <circle cx="32" cy="6" r="3" fill="currentColor" />
        <rect x="8" y="28" width="6" height="10" rx="2" fill="currentColor" opacity="0.85" />
        <rect x="50" y="28" width="6" height="10" rx="2" fill="currentColor" opacity="0.85" />
      </svg>
      <span class="brand-text">心理健康AI助手</span>
    </RouterLink>

    <nav class="nav" aria-label="主导航">
      <ThemeSwitcher placement="header" class="nav-theme" />
      <RouterLink to="/" class="nav-link" :class="{ 'nav-link--active': isActive('/') }">首页</RouterLink>

      <template v-if="loggedIn">
        <RouterLink to="/chat" class="nav-link" :class="{ 'nav-link--active': isActive('/chat') }">AI咨询</RouterLink>
        <RouterLink to="/diary" class="nav-link" :class="{ 'nav-link--active': isActive('/diary') }">情绪日记</RouterLink>
      </template>

      <RouterLink to="/knowledge" class="nav-link" :class="{ 'nav-link--active': isActive('/knowledge') }">
        知识库
      </RouterLink>

      <template v-if="!loggedIn">
        <RouterLink to="/auth/login" class="nav-link">登录</RouterLink>
        <RouterLink to="/auth/register" class="nav-btn nav-btn--primary">注册</RouterLink>
      </template>
      <button v-else type="button" class="nav-btn nav-btn--outline" @click="logout">退出登录</button>
    </nav>
    </div>
  </header>
</template>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 50;
  min-height: 80px;
  padding: 0;
  background: var(--fe-header-bg, #f6f1ea);
  box-shadow: 0 1px 0 var(--fe-header-border, rgba(74, 64, 52, 0.08));
}

.site-header__inner {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
  padding: 0 28px;
  box-sizing: border-box;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--fe-text, #3a3530);
}

.robot-icon {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  color: var(--fe-btn-primary-bg, #4d7d72);
}

.brand-text {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.nav {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 20px;
}

.nav-theme {
  margin-right: 4px;
}

.nav-link {
  font-size: 17px;
  color: var(--fe-text-muted, #4a4540);
  text-decoration: none;
  padding: 6px 0;
  border-bottom: 2px solid transparent;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.nav-link:hover {
  color: var(--fe-accent, #3d7d6d);
}

.nav-link--active {
  color: var(--fe-nav-active, #3d7d6d);
  border-bottom-color: var(--fe-nav-active-line, rgba(61, 125, 109, 0.55));
}

.nav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 9px 22px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  text-decoration: none;
  border: none;
  font-family: inherit;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.nav-btn--primary {
  background: var(--fe-btn-primary-bg, #4d7d72);
  color: #fff;
}

.nav-btn--primary:hover {
  background: var(--fe-btn-primary-hover, #3f6a60);
  color: #fff;
}

.nav-btn--outline {
  background: var(--fe-btn-outline-bg, rgba(255, 253, 248, 0.85));
  color: var(--fe-text, #3a3530);
  border: 1px solid var(--fe-btn-outline-border, rgba(74, 64, 52, 0.18));
}

.nav-btn--outline:hover {
  border-color: var(--fe-accent, #3d7d6d);
  color: var(--fe-accent, #3d7d6d);
}
</style>
