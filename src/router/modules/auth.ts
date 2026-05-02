import type { RouteRecordRaw } from 'vue-router'

const authRoutes: RouteRecordRaw[] = [
  {
    path: '/auth',
    component: () => import('@/views/auth/AuthLayout.vue'),
    redirect: { name: 'AuthLogin' },
    children: [
      {
        path: 'login',
        name: 'AuthLogin',
        component: () => import('@/views/auth/LoginView.vue'),
        meta: {
          title: '登录',
        },
      },
      {
        path: 'register',
        name: 'AuthRegister',
        component: () => import('@/views/auth/RegisterView.vue'),
        meta: {
          title: '注册',
        },
      },
    ],
  },
]

export default authRoutes
