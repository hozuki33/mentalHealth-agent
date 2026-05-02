import { THEME_STORAGE_KEY, type ThemeId, isThemeId } from '@/constants/theme'

export function readStoredTheme(): ThemeId {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (raw && isThemeId(raw)) return raw
  } catch {
    /* ignore */
  }
  return 'warm'
}
