import { describe, expect, it } from 'vitest'
import { newId } from './id'

describe('newId', () => {
  it('has 15 chars from [a-z0-9]', () => {
    for (let i = 0; i < 200; i++) expect(newId()).toMatch(/^[a-z0-9]{15}$/)
  })
  it('does not repeat in 10000 ids', () => {
    const set = new Set<string>()
    for (let i = 0; i < 10000; i++) set.add(newId())
    expect(set.size).toBe(10000)
  })
})
