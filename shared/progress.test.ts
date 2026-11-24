import { describe, expect, it } from 'vitest'
import {
  dayProgress,
  isPrepLate,
  isPrepared,
  madridDay,
  needsPrepAhead,
  orderProgress,
  prepDay,
} from './progress'
import type { Order, OrderItem } from './types'

let n = 0
function item(p: Partial<OrderItem> = {}): OrderItem {
  return {
    id: `i${n++}`,
    company: 'c',
    version: 1,
    updatedBy: 'u',
    deleted: false,
    created: '',
    updated: '',
    order: 'o1',
    name: 'x',
    measure: 'unit',
    quantity: 1,
    prepDayBefore: false,
    done: false,
    position: 1,
    ...p,
  }
}
function order(p: Partial<Order> = {}): Order {
  return {
    id: `o${n++}`,
    company: 'c',
    version: 1,
    updatedBy: 'u',
    deleted: false,
    created: '',
    updated: '',
    customer: 'k',
    pickupAt: '2026-12-17T10:00:00Z',
    status: 'pending',
    important: false,
    notes: '',
    ...p,
  }
}

describe('isPrepared / orderProgress', () => {
  it('no items -> not prepared', () => {
    expect(isPrepared([])).toBe(false)
    expect(orderProgress([])).toEqual({ done: 0, total: 0, prepared: false })
  })
  it('all done -> prepared', () => {
    const items = [item({ done: true }), item({ done: true })]
    expect(isPrepared(items)).toBe(true)
    expect(orderProgress(items)).toEqual({ done: 2, total: 2, prepared: true })
  })
  it('one pending -> not prepared', () => {
    const items = [item({ done: true }), item()]
    expect(isPrepared(items)).toBe(false)
    expect(orderProgress(items)).toEqual({ done: 1, total: 2, prepared: false })
  })
  it('deleted items do not count', () => {
    expect(isPrepared([item({ done: true }), item({ deleted: true })])).toBe(true)
    expect(isPrepared([item({ deleted: true, done: true })])).toBe(false)
    expect(orderProgress([item({ done: true }), item({ deleted: true })]).total).toBe(1)
  })
})

describe('dayProgress', () => {
  it('cancelled do not count; delivered count as prepared', () => {
    const a = order({ id: 'a' })
    const b = order({ id: 'b' })
    const c = order({ id: 'c', status: 'cancelled' })
    const d = order({ id: 'd', status: 'delivered' })
    const map = new Map<string, OrderItem[]>([
      ['a', [item({ done: true })]],
      ['b', [item({ done: false })]],
      ['c', [item({ done: true })]],
    ])
    expect(dayProgress([a, b, c, d], map)).toEqual({ total: 3, prepared: 2, delivered: 1 })
  })
  it('empty day', () => {
    expect(dayProgress([], new Map())).toEqual({ total: 0, prepared: 0, delivered: 0 })
  })
})

describe('madridDay / prepDay', () => {
  const cases: [string, string, string][] = [
    // winter: 00:30 Madrid = 23:30 UTC previous day
    ['2026-12-16T23:30:00Z', '2026-12-17', '2026-12-16'],
    // summer: 00:30 Madrid = 22:30 UTC previous day
    ['2026-07-14T22:30:00Z', '2026-07-15', '2026-07-14'],
    ['2026-07-14T21:59:00Z', '2026-07-14', '2026-07-13'],
    // spring change: 2026-03-29 01:00 UTC. Monday after.
    ['2026-03-30T08:00:00Z', '2026-03-30', '2026-03-29'],
    ['2026-03-28T23:30:00Z', '2026-03-29', '2026-03-28'],
    ['2026-03-29T00:59:00Z', '2026-03-29', '2026-03-28'],
    ['2026-03-29T01:00:00Z', '2026-03-29', '2026-03-28'],
    // autumn change: 2026-10-25 01:00 UTC. Monday after.
    ['2026-10-26T07:00:00Z', '2026-10-26', '2026-10-25'],
    ['2026-10-24T22:00:00Z', '2026-10-25', '2026-10-24'],
    ['2026-10-25T00:30:00Z', '2026-10-25', '2026-10-24'],
    ['2026-10-25T22:59:00Z', '2026-10-25', '2026-10-24'],
    ['2026-10-25T23:00:00Z', '2026-10-26', '2026-10-25'],
    // year boundary
    ['2027-01-01T10:00:00Z', '2027-01-01', '2026-12-31'],
    ['2026-12-31T23:30:00Z', '2027-01-01', '2026-12-31'],
    // leap day
    ['2028-03-01T10:00:00Z', '2028-03-01', '2028-02-29'],
  ]
  it.each(cases)('%s -> %s / %s', (iso, day, prep) => {
    expect(madridDay(iso)).toBe(day)
    expect(prepDay(iso)).toBe(prep)
  })
  it('rejects invalid dates', () => {
    expect(() => madridDay('nope')).toThrow()
  })
})

describe('needsPrepAhead / isPrepLate', () => {
  const pickup = '2026-12-17T10:00:00Z'
  it('needsPrepAhead ignores deleted', () => {
    expect(needsPrepAhead([item(), item({ prepDayBefore: true })])).toBe(true)
    expect(needsPrepAhead([item({ prepDayBefore: true, deleted: true })])).toBe(false)
    expect(needsPrepAhead([])).toBe(false)
  })
  it('eve is not late', () => {
    expect(isPrepLate(item({ prepDayBefore: true }), pickup, '2026-12-16')).toBe(false)
  })
  it('pickup day unmarked is late; later too', () => {
    expect(isPrepLate(item({ prepDayBefore: true }), pickup, '2026-12-17')).toBe(true)
    expect(isPrepLate(item({ prepDayBefore: true }), pickup, '2026-12-18')).toBe(true)
  })
  it('done is never late; non-prep items never late', () => {
    expect(isPrepLate(item({ prepDayBefore: true, done: true }), pickup, '2026-12-17')).toBe(false)
    expect(isPrepLate(item(), pickup, '2026-12-17')).toBe(false)
  })
})
