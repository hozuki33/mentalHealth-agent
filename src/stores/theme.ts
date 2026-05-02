import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { THEME_STORAGE_KEY, type ThemeId } from '@/constants/theme'
import { readStoredTheme } from '@/utils/readStoredTheme'
import { applyThemeToDocument } from '@/utils/themeDom'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<ThemeId>(readStoredTheme())
  applyThemeToDocument(theme.value)

  function setTheme(next: ThemeId) {
    theme.value = next
  }

  watch(
    theme,
    (v) => {
      applyThemeToDocument(v)
      try {
        localStorage.setItem(THEME_STORAGE_KEY, v)
      } catch {
        /* ignore */
      }
    },
    { flush: 'post' },
  )

  return { theme, setTheme }
})
