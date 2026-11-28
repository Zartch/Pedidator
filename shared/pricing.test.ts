import { describe, expect, it } from 'vitest'
import { lineCents, orderTotal } from './pricing'
import type { OrderItem } from './types'

function item(p: Partial<OrderItem> = {}): OrderItem {
  return {
    id: 'i',
    company: 'c',
    version: 1,
    updatedBy: 'u',
    deleted: false,
    created: '',
    updated: '',
    order: 'o',
    name: 'x',
    measure: 'unit',
    quantity: 1,
    prepDayBefore: false,
    done: false,
    position: 1,
    ...p,
  }
}

describe('lineCents', () => {
  it('no price -> null', () => {
    expect(lineCents(item())).toBeNull()
    expect(lineCents(item({ unitPriceCents: null }))).toBeNull()
  })
  it('unit', () => {
    expect(lineCents(item({ quantity: 3, unitPriceCents: 250 }))).toEqual({ cents: 750, estimated: false })
  })
  it('weight with real weight', () => {
    expect(
      lineCents(item({ measure: 'weight', unitPriceCents: 1999, weightGrams: 1250, orderedGrams: 1000 })),
    ).toEqual({ cents: 2499, estimated: false })
  })
  it('weight estimated', () => {
    expect(
      lineCents(item({ measure: 'weight', unitPriceCents: 1000, orderedGrams: 500 })),
    ).toEqual({ cents: 500, estimated: true })
  })
  it('weight with price but no weight at all -> null', () => {
    expect(lineCents(item({ measure: 'weight', unitPriceCents: 1000 }))).toBeNull()
  })
  it('rounding', () => {
    expect(
      lineCents(item({ measure: 'weight', unitPriceCents: 1999, weightGrams: 1250 })),
    ).toEqual({ cents: 2499, estimated: false })
  })
})

describe('orderTotal', () => {
  it('no priced line -> null', () => {
    expect(orderTotal([item(), item()])).toBeNull()
    expect(orderTotal([])).toBeNull()
  })
  it('mix sums priced and counts unpriced', () => {
    const items = [
      item({ quantity: 2, unitPriceCents: 100 }),
      item(),
      item({ measure: 'weight', unitPriceCents: 1000, orderedGrams: 500 }),
    ]
    expect(orderTotal(items)).toEqual({ cents: 700, estimated: true, unpriced: 1 })
  })
  it('not estimated when all exact', () => {
    expect(orderTotal([item({ unitPriceCents: 100 })])).toEqual({ cents: 100, estimated: false, unpriced: 0 })
  })
  it('ignores deleted', () => {
    expect(orderTotal([item({ unitPriceCents: 100, deleted: true })])).toBeNull()
    expect(orderTotal([item({ unitPriceCents: 100 }), item({ deleted: true })])).toEqual({
      cents: 100,
      estimated: false,
      unpriced: 0,
    })
  })
})
