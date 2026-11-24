import { describe, expect, it } from 'vitest'
import { formatMoney, parseMoney } from './format'

describe('parseMoney', () => {
  const cases: [string, number | null][] = [
    ['12,50', 1250],
    ['12.5', 1250],
    ['12', 1200],
    ['0,05', 5],
    ['0', 0],
    ['  12,50  ', 1250],
    ['1 250,5', 125050],
    ['', null],
    ['  ', null],
    ['-3', null],
    ['-3,50', null],
    ['abc', null],
    ['12,505', null],
    ['12.', null],
    ['12 €', null],
  ]
  it.each(cases)('%j -> %s', (input, expected) => {
    expect(parseMoney(input)).toBe(expected)
  })
})

describe('formatMoney', () => {
  it('formats', () => {
    expect(formatMoney(1250, 'es')).toBe('12,50 €')
    expect(formatMoney(1250, 'ca')).toBe('12,50 €')
    expect(formatMoney(5, 'es')).toBe('0,05 €')
    expect(formatMoney(0, 'ca')).toBe('0,00 €')
    expect(formatMoney(100000, 'es')).toBe('1000,00 €')
  })
})
