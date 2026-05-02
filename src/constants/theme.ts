export type ThemeId = 'light' | 'warm' | 'dark'

export const THEME_STORAGE_KEY = 'mh-app-theme'

export const THEME_OPTIONS: { id: ThemeId; label: string; hint: string }[] = [
  { id: 'light', label: '明亮', hint: '清爽浅色，适合日间办公' },
  { id: 'warm', label: '暖色护眼', hint: '纸感暖调，阅读更轻松' },
  { id: 'dark', label: '深色', hint: '低光环境，减轻视觉疲劳' },
]

export function isThemeId(v: string | null): v is ThemeId {
  return v === 'light' || v === 'warm' || v === 'dark'
}
