import { describe, expect, it } from 'vitest'
import { nameKey } from './nameKey'

describe('nameKey', () => {
  const cases: [string, string][] = [
    ['  José   Pérez ', 'jose perez'],
    ['Núria Ça Ñoño', 'nuria ca nono'],
    ['Col·legi  Sant Jordi', 'col·legi sant jordi'],
    ['L·L', 'l·l'],
    ['MARIA', 'maria'],
    ['a\tb\n c', 'a b c'],
    ['', ''],
  ]
  it.each(cases)('%j -> %j', (input, expected) => {
    expect(nameKey(input)).toBe(expected)
  })
})
