<script setup lang="ts">
import FrontendHeader from '@/components/FrontendHeader.vue'
</script>

<template>
  <div class="frontend-shell">
    <FrontendHeader />
    <main class="frontend-main">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.frontend-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--fe-page-bg, #e8dfd4);
}

.frontend-main {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
</style>
