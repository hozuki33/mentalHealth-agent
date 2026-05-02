import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import frontendRoutes from '@/router/modules/frontend'
import backendRoutes from '@/router/modules/backend'
import authRoutes from '@/router/modules/auth'
import { isAdminLoggedIn, isBackendAdminSession } from '@/utils/auth'

const routes: RouteRecordRaw[] = [
  ...frontendRoutes,
  ...authRoutes,
  ...backendRoutes,
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFoundView.vue'),
    meta: {
      title: '页面不存在',
    },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  if (to.path.startsWith('/admin')) {
    if (!isAdminLoggedIn()) {
      return { name: 'AuthLogin', query: { redirect: to.fullPath } }
    }
    if (!isBackendAdminSession()) {
      return { name: 'FrontendHome' }
    }
    return true
  }
  if (to.meta.requiresAuth && !isAdminLoggedIn()) {
    return {
      name: 'AuthLogin',
      query: { redirect: to.fullPath },
    }
  }
  return true
})

router.afterEach((to) => {
  const pageTitle = to.meta.title as string | undefined
  document.title = pageTitle ? `${pageTitle} - mentalhealth-ai-assistant` : 'mentalhealth-ai-assistant'
})

export default router
