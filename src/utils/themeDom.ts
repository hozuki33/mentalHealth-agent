import type { ThemeId } from '@/constants/theme'

export function applyThemeToDocument(theme: ThemeId) {
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  root.classList.toggle('dark', theme === 'dark')
}
