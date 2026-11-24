import { describe, expect, it } from 'vitest'
import { LOCALES, resources, type Dictionary } from './index'

function flatten(dictionary: Dictionary, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(dictionary)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') out[path] = value
    else Object.assign(out, flatten(value, path))
  }
  return out
}

const namespaces = [
  ...new Set(Object.values(resources).flatMap((byNs) => Object.keys(byNs))),
].sort()

describe('i18n parity', () => {
  it('has every supported locale', () => {
    for (const locale of LOCALES) expect(resources[locale]).toBeDefined()
  })

  it.each(namespaces)('namespace "%s" exists in every locale', (ns) => {
    for (const locale of LOCALES) expect(resources[locale][ns]).toBeDefined()
  })

  it.each(namespaces)('namespace "%s" has the same keys in every locale', (ns) => {
    const [first, ...rest] = LOCALES.map((locale) =>
      Object.keys(flatten(resources[locale][ns] ?? {})).sort(),
    )
    for (const keys of rest) expect(keys).toEqual(first)
  })

  it.each(namespaces)('namespace "%s" has no empty values', (ns) => {
    for (const locale of LOCALES) {
      for (const [key, value] of Object.entries(flatten(resources[locale][ns] ?? {}))) {
        expect(value.trim(), `${locale}/${ns}:${key}`).not.toBe('')
      }
    }
  })
})
