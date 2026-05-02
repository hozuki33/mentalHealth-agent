import type { RouteRecordRaw } from 'vue-router'

const backendRoutes: RouteRecordRaw[] = [
  {
    path: '/admin',
    component: () => import('@/views/backend/BackendLayout.vue'),
    meta: {
      area: 'backend',
      requiresAuth: true,
    },
    children: [
      {
        path: '',
        name: 'AdminDashboard',
        component: () => import('@/views/backend/Dashboard.vue'),
        meta: {
          title: '数据分析',
        },
      },
      {
        path: 'articles',
        name: 'AdminArticles',
        component: () => import('@/views/backend/KnowledgeArticles.vue'),
        meta: {
          title: '知识文章',
        },
      },
      {
        path: 'consults',
        name: 'AdminConsults',
        component: () => import('@/views/backend/ConsultRecords.vue'),
        meta: {
          title: '咨询记录',
        },
      },
      {
        path: 'moods',
        name: 'AdminMoods',
        component: () => import('@/views/backend/MoodLogs.vue'),
        meta: {
          title: '情绪日志',
        },
      },
      {
        path: 'profile',
        name: 'AdminProfile',
        component: () => import('@/views/backend/ProfileCenter.vue'),
        meta: {
          title: '个人中心',
        },
      },
    ],
  },
]

export default backendRoutes
