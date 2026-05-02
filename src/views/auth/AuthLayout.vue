<script setup lang="ts">
import { RouterView } from 'vue-router'
import ThemeSwitcher from '@/components/ThemeSwitcher.vue'
</script>

<template>
  <div class="auth-shell">
    <aside class="auth-brand" aria-hidden="true">
      <h1 class="brand-title">心理AI助手</h1>
      <p class="brand-tagline">
        每个深夜，每个焦虑的时刻，我们都在这里。不必独自承受，让心与心的连接温暖您的每一天
      </p>
      <div class="brand-circle">
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
      </div>
    </aside>
    <main class="auth-main">
      <div class="auth-theme-wrap">
        <ThemeSwitcher placement="navbar" />
      </div>
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.auth-shell {
  min-height: 100vh;
  display: flex;
  flex-wrap: wrap;
}

.auth-brand {
  flex: 0 1 42%;
  min-width: 280px;
  min-height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28px;
  padding: 48px 40px;
  background: var(--auth-aside-bg, #4a9b8e);
  color: #fff;
  text-align: center;
}

.brand-title {
  margin: 0;
  font-size: clamp(28px, 4vw, 36px);
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #fff;
}

.brand-circle {
  width: 132px;
  height: 132px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.robot-icon {
  width: 72px;
  height: 72px;
  color: #fff;
}

.brand-tagline {
  margin: 0;
  max-width: 360px;
  font-size: 15px;
  font-weight: 400;
  line-height: 1.65;
  color: rgba(255, 255, 255, 0.92);
}

.auth-main {
  flex: 1 1 400px;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 32px;
  background: var(--auth-main-bg, #fff);
  position: relative;
}

.auth-theme-wrap {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 2;
}
</style>
