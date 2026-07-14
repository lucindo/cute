export type LocaleId = 'en' | 'pt-BR'

export const LOCALES: readonly LocaleId[] = ['en', 'pt-BR']

export const DEFAULT_LOCALE: LocaleId = 'en'

export function isValidLocale(raw: unknown): raw is LocaleId {
  return typeof raw === 'string' && (LOCALES as readonly string[]).includes(raw)
}

// 'system' follows the OS preference via matchMedia; 'light'/'dark' pin it.
export type ThemeId = 'light' | 'dark' | 'system'

export const THEMES: readonly ThemeId[] = ['light', 'dark', 'system']

export const DEFAULT_THEME: ThemeId = 'system'

export function isValidTheme(raw: unknown): raw is ThemeId {
  return typeof raw === 'string' && (THEMES as readonly string[]).includes(raw)
}

// Collapse the tri-state pref to the concrete attribute the stylesheet reads.
export function resolveTheme(theme: ThemeId, systemPrefersDark: boolean): 'light' | 'dark' {
  if (theme === 'system') return systemPrefersDark ? 'dark' : 'light'
  return theme
}
