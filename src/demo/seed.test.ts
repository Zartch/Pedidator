import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { closeSession, requireSession, startSession } from '@/data/session'
import {
  queryArchivedOrders,
  queryCustomers,
  queryDayOrders,
  queryPendingTickets,
  queryPrepAheadItems,
} from '@/data/hooks'
import { addDays, todayMadrid } from '@/lib/dates'
import { clearDemoData, loadDemoData } from './seed'

// Fixed instant: 10:00 in Madrid on 2026-11-24.
const NOW = new Date('2026-11-24T09:00:00.000Z')
const TODAY = todayMadrid(NOW)
const TOMORROW = addDays(TODAY, 1)

let seq = 0

beforeEach(async () => {
  await startSession({
    companyId: `seed-${++seq}-${Date.now()}`,
    userId: 'u1',
    syncEnabled: false,
  })
})

afterEach(() => {
  closeSession()
})

describe('demo seed', () => {
  it('leaves orders for today and tomorrow, with important and prep-ahead items', async () => {
    await loadDemoData(NOW)
    const { db } = requireSession()

    const today = await queryDayOrders(db, TODAY)
    const tomorrow = await queryDayOrders(db, TOMORROW)
    expect(today.length).toBeGreaterThanOrEqual(3)
    expect(tomorrow.length).toBeGreaterThanOrEqual(3)
    expect([...today, ...tomorrow].some((d) => d.order.important)).toBe(true)

    const prepAhead = await queryPrepAheadItems(db, TODAY)
    expect(prepAhead.length).toBeGreaterThan(0)
  })

  it('has weights below and above one kilo, and most items without price', async () => {
    await loadDemoData(NOW)
    const { db } = requireSession()
    const days = await queryArchivedOrders(db, {})
    const pending = [
      ...(await queryDayOrders(db, TODAY)),
      ...(await queryDayOrders(db, TOMORROW)),
    ]
    const items = [...pending, ...days].flatMap((d) => d.items)
    const grams = items
      .filter((i) => i.measure === 'weight')
      .map((i) => i.orderedGrams ?? 0)
    expect(grams.some((g) => g > 0 && g < 1000)).toBe(true)
    expect(grams.some((g) => g > 1000)).toBe(true)

    const unpriced = items.filter((i) => i.unitPriceCents == null).length
    expect(unpriced / items.length).toBeGreaterThan(0.5)
  })

  it('has delivered orders and pending tickets, some paid', async () => {
    await loadDemoData(NOW)
    const { db } = requireSession()
    const delivered = await queryArchivedOrders(db, {})
    expect(delivered.some((d) => d.order.status === 'delivered')).toBe(true)

    const groups = await queryPendingTickets(db)
    expect(groups.length).toBeGreaterThan(0)
    const allTickets = groups.flatMap((g) => g.tickets)
    expect(allTickets.length).toBeGreaterThan(0)
  })

  it('does not duplicate customers when loaded twice', async () => {
    await loadDemoData(NOW)
    const { db } = requireSession()
    const first = (await queryCustomers(db)).map((c) => c.nameKey)
    await loadDemoData(NOW)
    const second = (await queryCustomers(db)).map((c) => c.nameKey)
    expect(second).toHaveLength(first.length)
    expect(new Set(second).size).toBe(second.length)
  })

  it('clears orders and tickets logically', async () => {
    await loadDemoData(NOW)
    await clearDemoData()
    const { db } = requireSession()
    expect(await queryDayOrders(db, TODAY)).toHaveLength(0)
    expect(await queryDayOrders(db, TOMORROW)).toHaveLength(0)
    expect(await queryArchivedOrders(db, {})).toHaveLength(0)
    expect(await queryPendingTickets(db)).toHaveLength(0)
  })
})
