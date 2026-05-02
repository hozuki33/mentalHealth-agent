import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from '@/App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import '@/styles/theme.css'
import router from '@/router'
import { applyThemeToDocument } from '@/utils/themeDom'
import { readStoredTheme } from '@/utils/readStoredTheme'
import { useThemeStore } from '@/stores/theme'

applyThemeToDocument(readStoredTheme())

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
useThemeStore(pinia)
app.use(ElementPlus)
app.use(router)
app.mount('#app')
