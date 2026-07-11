export type LocaleId = 'en' | 'pt-BR'

export const LOCALES: readonly LocaleId[] = ['en', 'pt-BR']

export const DEFAULT_LOCALE: LocaleId = 'en'

export function isValidLocale(raw: unknown): raw is LocaleId {
  return typeof raw === 'string' && (LOCALES as readonly string[]).includes(raw)
}
