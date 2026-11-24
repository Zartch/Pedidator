export const LOCALES = ['ca', 'es'] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'ca'

function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value)
}

/**
 * Returns the first candidate that is a supported, non-empty locale.
 * Order: the user's locale, then the company's, then the stored one.
 * Falls back to DEFAULT_LOCALE (ca).
 */
export function resolveLocale(
  userLocale: string | null | undefined,
  companyLocale: string | null | undefined,
  stored: string | null | undefined,
): Locale {
  for (const candidate of [userLocale, companyLocale, stored]) {
    const value = candidate?.trim()
    if (value && isLocale(value)) return value
  }
  return DEFAULT_LOCALE
}
