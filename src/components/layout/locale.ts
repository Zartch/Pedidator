import i18n, { type Locale } from '@/i18n'

const STORAGE_KEY = 'pedidator.locale'

/** Locale chosen on this device, or null. Storage can be blocked (private window): then null. */
export function readStoredLocale(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

/** Switches the UI language, updates <html lang> and remembers the choice on this device. */
export function applyLocale(locale: Locale): void {
  void i18n.changeLanguage(locale)
  document.documentElement.lang = locale
  try {
    window.localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // Storage blocked: the choice lasts until the page reloads.
  }
}
