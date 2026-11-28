import { describe, expect, it } from 'vitest'
import { displayUnit, formatQuantity, formatWeight, parseWeight, toInputValue } from './weight'

describe('parseWeight', () => {
  const cases: [string, 'g' | 'kg', number | null][] = [
    ['750', 'g', 750],
    ['1,5', 'kg', 1500],
    ['1.5', 'kg', 1500],
    ['0,75', 'kg', 750],
    ['750g', 'kg', 750],
    ['750 g', 'kg', 750],
    ['1,5kg', 'g', 1500],
    ['1,5 KG', 'g', 1500],
    ['2 kg', 'g', 2000],
    ['1,005', 'kg', 1005],
    ['  500 ', 'g', 500],
    ['750,5', 'g', null],
    ['750.5 g', 'kg', null],
    ['1,2345', 'kg', null],
    ['', 'g', null],
    ['  ', 'kg', null],
    ['0', 'g', null],
    ['0,000', 'kg', null],
    ['-5', 'g', null],
    ['-1,5', 'kg', null],
    ['abc', 'g', null],
    ['1,5 lb', 'kg', null],
    ['1,', 'kg', null],
  ]
  it.each(cases)('%s (%s) -> %s', (input, unit, expected) => {
    expect(parseWeight(input, unit)).toBe(expected)
  })
})

describe('formatWeight', () => {
  const cases: [number, string][] = [
    [5, '5 g'],
    [999, '999 g'],
    [1000, '1 kg'],
    [1500, '1,5 kg'],
    [1250, '1,25 kg'],
    [2480, '2,48 kg'],
    [12005, '12,005 kg'],
  ]
  it.each(cases)('%s -> %s', (g, expected) => {
    expect(formatWeight(g)).toBe(expected)
  })
})

describe('toInputValue / displayUnit', () => {
  it('examples', () => {
    expect(toInputValue(1500, 'kg')).toBe('1,5')
    expect(toInputValue(1500, 'g')).toBe('1500')
    expect(displayUnit(999)).toBe('g')
    expect(displayUnit(1000)).toBe('kg')
  })
  it('round-trips with parseWeight without losing grams', () => {
    for (const g of [1, 5, 750, 999, 1000, 1005, 1250, 1500, 2480, 12005, 100000]) {
      expect(parseWeight(toInputValue(g, displayUnit(g)), displayUnit(g))).toBe(g)
      expect(parseWeight(toInputValue(g, 'g'), 'g')).toBe(g)
      expect(parseWeight(toInputValue(g, 'kg'), 'kg')).toBe(g)
    }
  })
})

describe('formatQuantity', () => {
  it('formats units, weights and missing weight', () => {
    expect(formatQuantity({ measure: 'unit', quantity: 6 })).toBe('6 u')
    expect(formatQuantity({ measure: 'weight', quantity: 1, orderedGrams: 1500 })).toBe('1,5 kg')
    expect(formatQuantity({ measure: 'weight', quantity: 1 })).toBe('')
    expect(formatQuantity({ measure: 'weight', quantity: 1, orderedGrams: null })).toBe('')
  })
})
