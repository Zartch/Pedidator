import { describe, expect, it } from 'vitest'
import { deriveBrand } from './theme'

// Values from docs/design/tokens.json (brand, on-brand, brand-strong, brand-soft).
const cases = [
  ['neutral', '#2d3138', '#ffffff', '#1c2026', '#eef0f3'],
  ['butcher', '#a31d2f', '#ffffff', '#860820', '#feebea'],
  ['fishmonger', '#0f67b3', '#ffffff', '#0e5391', '#e6f2fe'],
  ['greengrocer', '#39841c', '#ffffff', '#2a6e0c', '#e5f6e0'],
  ['bakery', '#e2a52b', '#1b1d1f', '#805c13', '#fdeed6'],
] as const

describe('deriveBrand', () => {
  it.each(cases)('%s', (_name, brand, onBrand, strong, soft) => {
    const r = deriveBrand(brand)
    expect(r).not.toBeNull()
    expect(r!.brand).toBe(brand)
    expect(r!.onBrand).toBe(onBrand)
    expect(r!.brandStrong).toBe(strong)
    expect(r!.brandSoft).toBe(soft)
  })
  it('invalid hex -> null', () => {
    expect(deriveBrand('nope')).toBeNull()
    expect(deriveBrand('#12345')).toBeNull()
    expect(deriveBrand('')).toBeNull()
  })
  it('flags adjusted and nearDanger', () => {
    expect(deriveBrand('#ffd800')?.adjusted).toBe(false)
    expect(deriveBrand('#d08a00')?.adjusted).toBe(true)
    expect(deriveBrand('#a31d2f')?.nearDanger).toBe(true)
    expect(deriveBrand('#0f67b3')?.nearDanger).toBe(false)
  })
})
