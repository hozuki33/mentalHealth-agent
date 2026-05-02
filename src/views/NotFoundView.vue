<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const backHome = () => {
  router.replace('/')
}
</script>

<template>
  <div class="page">
    <el-result icon="warning" title="404" sub-title="页面不存在">
      <template #extra>
        <el-button type="primary" @click="backHome">返回首页</el-button>
      </template>
    </el-result>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
}
</style>
