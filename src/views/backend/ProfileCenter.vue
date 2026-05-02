<script setup lang="ts">
import { reactive } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { ref } from 'vue'
import PageHead from '@/components/PageHead.vue'
import { getAdminUser, updateAdminProfile, type AdminProfileInput } from '@/utils/auth'

const user = getAdminUser()
const formRef = ref<FormInstance>()

const form = reactive<AdminProfileInput>({
  nickname: user.nickname,
  phone: user.phone,
  email: user.email,
  department: user.department,
  bio: user.bio,
})

const rules: FormRules<AdminProfileInput> = {
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱', trigger: 'blur' },
  ],
  department: [{ required: true, message: '请输入所属部门', trigger: 'blur' }],
}

async function handleSave() {
  const ok = await formRef.value?.validate().catch(() => false)
  if (!ok) return

  updateAdminProfile({ ...form })
  ElMessage.success('个人资料已保存')
}

function handleReset() {
  const latest = getAdminUser()
  Object.assign(form, {
    nickname: latest.nickname,
    phone: latest.phone,
    email: latest.email,
    department: latest.department,
    bio: latest.bio,
  })
}

function handlePasswordChange() {
  ElMessage.info('密码修改接口接入后可在此处打开修改弹窗')
}
</script>

<template>
  <div class="profile-page">
    <el-card shadow="never">
      <template #header>
        <PageHead title="个人中心" :show-add="false" />
      </template>

      <div class="profile-hero">
        <el-avatar :size="72" :src="user.avatar" />
        <div class="profile-hero__main">
          <h2 class="profile-hero__name">{{ form.nickname || user.username }}</h2>
          <p class="profile-hero__meta">{{ user.role }} · {{ form.department }}</p>
          <div class="profile-hero__tags">
            <el-tag type="success">{{ user.status }}</el-tag>
            <el-tag type="info">最近登录：{{ user.lastLoginAt }}</el-tag>
          </div>
        </div>
      </div>
    </el-card>

    <el-row :gutter="16">
      <el-col :xs="24" :lg="16">
        <el-card shadow="never" class="panel-card">
          <template #header>
            <PageHead title="基础资料" :show-add="false">
              <template #extra>
                <el-button @click="handleReset">重置</el-button>
                <el-button type="primary" @click="handleSave">保存资料</el-button>
              </template>
            </PageHead>
          </template>

          <el-form ref="formRef" :model="form" :rules="rules" label-width="96px" class="profile-form">
            <el-form-item label="登录账号">
              <el-input :model-value="user.username" disabled />
            </el-form-item>
            <el-form-item label="昵称" prop="nickname">
              <el-input v-model="form.nickname" placeholder="请输入昵称" />
            </el-form-item>
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="form.phone" placeholder="请输入手机号" />
            </el-form-item>
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="form.email" placeholder="请输入邮箱" />
            </el-form-item>
            <el-form-item label="所属部门" prop="department">
              <el-input v-model="form.department" placeholder="请输入所属部门" />
            </el-form-item>
            <el-form-item label="个人简介" prop="bio">
              <el-input
                v-model="form.bio"
                type="textarea"
                :rows="4"
                maxlength="120"
                show-word-limit
                placeholder="请输入个人简介"
              />
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="8">
        <el-card shadow="never" class="panel-card">
          <template #header>
            <PageHead title="安全信息" :show-add="false" />
          </template>

          <el-descriptions :column="1" border>
            <el-descriptions-item label="账号角色">{{ user.role }}</el-descriptions-item>
            <el-descriptions-item label="账号状态">
              <el-tag type="success">{{ user.status }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="登录账号">{{ user.username }}</el-descriptions-item>
            <el-descriptions-item label="最近登录">{{ user.lastLoginAt }}</el-descriptions-item>
          </el-descriptions>

          <el-button class="security-action" type="primary" plain @click="handlePasswordChange">
            修改密码
          </el-button>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.profile-hero {
  display: flex;
  align-items: center;
  gap: 18px;
}

.profile-hero__main {
  min-width: 0;
}

.profile-hero__name {
  margin: 0 0 6px;
  font-size: 24px;
  color: var(--el-text-color-primary);
}

.profile-hero__meta {
  margin: 0 0 10px;
  color: var(--el-text-color-regular);
}

.profile-hero__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.panel-card {
  height: 100%;
  border-radius: 12px;
}

.profile-form {
  max-width: 680px;
}

.security-action {
  width: 100%;
  margin-top: 18px;
}
</style>
