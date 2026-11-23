import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { DEFAULT_LOCALE } from './resolveLocale'

export { DEFAULT_LOCALE, LOCALES, resolveLocale, type Locale } from './resolveLocale'

export type Dictionary = { [key: string]: string | Dictionary }
export type Resources = Record<string, Record<string, Dictionary>>

const files = import.meta.glob<Dictionary>('./*/*.json', {
  eager: true,
  import: 'default',
})

/** Builds `{ [locale]: { [namespace]: dictionary } }` from `src/i18n/<locale>/<namespace>.json`. */
export function buildResources(modules: Record<string, Dictionary>): Resources {
  const resources: Resources = {}
  for (const [path, dictionary] of Object.entries(modules)) {
    const match = /^\.\/([^/]+)\/([^/]+)\.json$/.exec(path)
    if (!match) continue
    const [, locale, namespace] = match
    resources[locale] ??= {}
    resources[locale][namespace] = dictionary
  }
  return resources
}

export const resources = buildResources(files)

const namespaces = [
  ...new Set(Object.values(resources).flatMap((byNamespace) => Object.keys(byNamespace))),
]

void i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  ns: namespaces,
  defaultNS: 'common',
  interpolation: { escapeValue: false },
})

export default i18n
