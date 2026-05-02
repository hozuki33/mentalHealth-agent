<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { register } from '@/api/frontend'

const router = useRouter()
const formRef = ref<FormInstance>()
const loading = ref(false)

const REGISTER_GENDER = 2
const REGISTER_USER_TYPE = 1

const form = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
})

const validateConfirm = (_rule: unknown, value: string, callback: (e?: Error) => void) => {
  if (value !== form.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请输入确认密码', trigger: 'blur' },
    { validator: validateConfirm, trigger: 'blur' },
  ],
}

const goLogin = () => {
  router.push({ name: 'AuthLogin' })
}

const onSubmit = async () => {
  const ok = await formRef.value?.validate().catch(() => false)
  if (!ok) return
  loading.value = true
  try {
    await register({
      username: form.username.trim(),
      email: form.email.trim(),
      password: form.password,
      confirmPassword: form.confirmPassword,
      gender: REGISTER_GENDER,
      userType: REGISTER_USER_TYPE,
    })
    ElMessage.success('注册成功')
    router.push({ name: 'AuthLogin' })
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '注册失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="panel">
    <h1 class="title">创建您的账户</h1>
    <p class="subtitle">请填写注册信息</p>
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="form" @submit.prevent>
      <el-form-item label="用户名" prop="username">
        <el-input v-model="form.username" placeholder="请输入用户名" autocomplete="username" />
      </el-form-item>
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="form.email" placeholder="请输入邮箱" autocomplete="email" />
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input
          v-model="form.password"
          type="password"
          placeholder="请输入密码"
          show-password
          autocomplete="new-password"
        />
      </el-form-item>
      <el-form-item label="确认密码" prop="confirmPassword">
        <el-input
          v-model="form.confirmPassword"
          type="password"
          placeholder="请再次输入密码"
          show-password
          autocomplete="new-password"
        />
      </el-form-item>
      <el-button type="primary" class="submit" :loading="loading" native-type="submit" @click="onSubmit">
        注册
      </el-button>
    </el-form>
    <div class="switch-row">
      <span class="hint">已有账号？</span>
      <el-button link type="primary" @click="goLogin">去登录</el-button>
    </div>
  </div>
</template>

<style scoped>
.panel {
  width: min(440px, 100%);
}

.title {
  margin: 0 0 8px;
  font-size: 26px;
  font-weight: 700;
  color: var(--mh-text, #303133);
}

.subtitle {
  margin: 0 0 24px;
  font-size: 14px;
  color: var(--mh-text-secondary, #909399);
}

.form {
  margin-bottom: 8px;
}

.form :deep(.el-form-item) {
  margin-bottom: 18px;
}

.form :deep(.el-form-item__label) {
  font-weight: 500;
  color: var(--mh-text, #303133);
}

.submit {
  width: 100%;
  margin-top: 4px;
  height: 44px;
  font-size: 16px;
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
