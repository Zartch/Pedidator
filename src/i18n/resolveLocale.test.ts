import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE, resolveLocale } from './resolveLocale'

describe('resolveLocale', () => {
  it('defaults to ca when nothing is given', () => {
    expect(resolveLocale(undefined, undefined, undefined)).toBe('ca')
    expect(DEFAULT_LOCALE).toBe('ca')
  })

  it('prefers the user locale over the company and stored ones', () => {
    expect(resolveLocale('es', 'ca', 'ca')).toBe('es')
  })

  it('uses the company locale when the user has none', () => {
    expect(resolveLocale(null, 'es', 'ca')).toBe('es')
    expect(resolveLocale('', 'es', 'ca')).toBe('es')
  })

  it('uses the stored locale when user and company have none', () => {
    expect(resolveLocale(undefined, '', 'es')).toBe('es')
  })

  it('skips empty and unsupported values', () => {
    expect(resolveLocale('  ', 'fr', 'es')).toBe('es')
    expect(resolveLocale('en', 'xx', null)).toBe('ca')
  })
})
