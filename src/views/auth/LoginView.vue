<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { parseLoginData, setAdminSession } from '@/utils/auth'
import { login } from '@/api/admin'

const router = useRouter()
const route = useRoute()
const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({
  username: '',
  password: '',
})

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

const goRegister = () => {
  router.push({ name: 'AuthRegister' })
}

const onSubmit = async () => {
  const ok = await formRef.value?.validate().catch(() => false)
  if (!ok) return
  loading.value = true
  try {
    const data = await login({
      username: form.username.trim(),
      password: form.password,
    })
    const { token, username, userInfo } = parseLoginData(data, form.username.trim())
    if (!token) {
      throw new Error('登录响应中未返回有效令牌，请检查接口或联系管理员')
    }
    setAdminSession(username, token, userInfo)
    ElMessage.success('登录成功')

    const redirectParam = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    const inputName = form.username.trim().toLowerCase()
    const resolvedName = username.trim().toLowerCase()
    const isAdminLogin = inputName === 'admin' || resolvedName === 'admin'

    if (isAdminLogin) {
      if (redirectParam.startsWith('/admin')) {
        router.push(redirectParam)
      } else {
        router.push('/admin')
      }
    } else if (redirectParam && !redirectParam.startsWith('/admin')) {
      router.push(redirectParam)
    } else {
      router.push({ name: 'FrontendHome' })
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="panel">
    <h1 class="title">登录</h1>
    <p class="subtitle">使用账号登录心理健康 AI 助手</p>
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="form" @submit.prevent>
      <el-form-item label="用户名" prop="username">
        <el-input v-model="form.username" placeholder="用户名" autocomplete="username" />
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input
          v-model="form.password"
          type="password"
          placeholder="密码"
          show-password
          autocomplete="current-password"
        />
      </el-form-item>
      <el-button type="primary" class="submit" :loading="loading" native-type="submit" @click="onSubmit">
        登录
      </el-button>
    </el-form>
    <div class="switch-row">
      <span class="hint">还没有账号？</span>
      <el-button link type="primary" @click="goRegister">去注册</el-button>
    </div>
  </div>
</template>

<style scoped>
.panel {
  width: min(400px, 100%);
}

.title {
  margin: 0 0 8px;
  font-size: 26px;
  font-weight: 700;
  color: var(--mh-text, #303133);
}

.subtitle {
  margin: 0 0 28px;
  font-size: 14px;
  color: var(--mh-text-secondary, #909399);
}

.form {
  margin-bottom: 8px;
}

.submit {
  width: 100%;
  margin-top: 8px;
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-top: 20px;
}

.hint {
  font-size: 14px;
  color: var(--mh-text-secondary, #606266);
}
</style>
