import type { RouteRecordRaw } from 'vue-router'

const frontendRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/views/frontend/FrontendLayout.vue'),
    children: [
      {
        path: '',
        name: 'FrontendHome',
        component: () => import('@/views/frontend/HomeView.vue'),
        meta: {
          title: '首页',
          area: 'frontend',
        },
      },
      {
        path: 'knowledge',
        name: 'FrontendKnowledge',
        component: () => import('@/views/frontend/KnowledgeView.vue'),
        meta: {
          title: '知识库',
          area: 'frontend',
        },
      },
      {
        path: 'diary',
        name: 'FrontendDiary',
        component: () => import('@/views/frontend/MoodDiaryView.vue'),
        meta: {
          title: '情绪日记',
          area: 'frontend',
          requiresAuth: true,
        },
      },
      {
        path: 'chat',
        name: 'FrontendChat',
        component: () => import('@/views/frontend/ChatView.vue'),
        meta: {
          title: 'AI 心理对话',
          area: 'frontend',
          requiresAuth: true,
        },
      },
    ],
  },
]

export default frontendRoutes
