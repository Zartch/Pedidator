import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  queryArchivedOrders,
  queryCustomer,
  queryCustomerTickets,
  queryMonthDeliveredCount,
  queryCustomerOrders,
  queryDayOrders,
  queryMonthMarks,
  queryPendingTickets,
  queryPrepAheadItems,
  querySuggestCustomers,
  querySuggestItems,
} from './hooks'
import { getOrCreateCustomerByName } from './repo/customers'
import { setItemDone } from './repo/orderItems'
import { cancelOrder, createOrder, deliverOrder } from './repo/orders'
import { createTicket, markTicketPaid } from './repo/tickets'
import { closeSession, requireSession, startSession } from './session'

let n = 0
beforeEach(async () => {
  await startSession({ companyId: `hk${n++}`, userId: 'u', syncEnabled: false })
})
afterEach(closeSession)

const db = () => requireSession().db

describe('day orders', () => {
  it('uses the Madrid day: 23:30 UTC in winter is already the next day', async () => {
    const c = await getOrCreateCustomerByName('Ana')
    await createOrder(
      { customer: c.id, pickupAt: '2026-12-16T23:30:00.000Z' },
      [{ name: 'A', measure: 'unit' }],
    )
    await createOrder(
      { customer: c.id, pickupAt: '2026-12-17T08:00:00.000Z' },
      [{ name: 'B', measure: 'unit' }],
    )
    const day17 = await queryDayOrders(db(), '2026-12-17')
    expect(day17.map((d) => d.items[0].name)).toEqual(['A', 'B'])
    expect(day17[0].customer?.name).toBe('Ana')
    expect(await queryDayOrders(db(), '2026-12-16')).toHaveLength(0)
  })

  it('summer: 22:30 UTC is the next Madrid day', async () => {
    const c = await getOrCreateCustomerByName('Ana')
    await createOrder(
      { customer: c.id, pickupAt: '2026-07-01T22:30:00.000Z' },
      [{ name: 'A', measure: 'unit' }],
    )
    expect(await queryDayOrders(db(), '2026-07-02')).toHaveLength(1)
    expect(await queryDayOrders(db(), '2026-07-01')).toHaveLength(0)
  })
})

describe('prep ahead', () => {
  it('lists prepDayBefore items of tomorrow pending orders; marking is visible in the order', async () => {
    const c = await getOrCreateCustomerByName('Ana')
    const { items } = await createOrder(
      { customer: c.id, pickupAt: '2026-12-18T10:00:00.000Z' },
      [
        { name: 'Pollo', measure: 'unit', prepDayBefore: true },
        { name: 'Pan', measure: 'unit' },
      ],
    )
    const cancelled = await createOrder(
      { customer: c.id, pickupAt: '2026-12-18T11:00:00.000Z' },
      [{ name: 'X', measure: 'unit', prepDayBefore: true }],
    )
    await cancelOrder(cancelled.order.id)
    const list = await queryPrepAheadItems(db(), '2026-12-17')
    expect(list).toHaveLength(1)
    expect(list[0].item.name).toBe('Pollo')
    expect(list[0].customer?.name).toBe('Ana')
    expect(list[0].order.pickupAt).toBe('2026-12-18T10:00:00.000Z')
    await setItemDone(items[0].id, true)
    expect((await queryDayOrders(db(), '2026-12-18'))[0].items[0].done).toBe(
      true,
    )
    expect(await queryPrepAheadItems(db(), '2026-12-18')).toHaveLength(0)
  })
})

describe('month marks', () => {
  it('marks hasOrders, important and prepAhead; ignores cancelled', async () => {
    const c = await getOrCreateCustomerByName('Ana')
    await createOrder(
      { customer: c.id, pickupAt: '2026-12-31T10:00:00.000Z', important: true },
      [{ name: 'A', measure: 'unit', prepDayBefore: true }],
    )
    await createOrder(
      { customer: c.id, pickupAt: '2026-12-05T10:00:00.000Z' },
      [{ name: 'B', measure: 'unit' }],
    )
    const x = await createOrder(
      { customer: c.id, pickupAt: '2026-12-06T10:00:00.000Z' },
      [{ name: 'C', measure: 'unit' }],
    )
    await cancelOrder(x.order.id)
    await createOrder(
      { customer: c.id, pickupAt: '2027-01-01T10:00:00.000Z' },
      [{ name: 'D', measure: 'unit' }],
    )
    const marks = await queryMonthMarks(db(), '2026-12')
    expect(marks['2026-12-31']).toEqual({
      hasOrders: true,
      important: true,
      prepAhead: true,
    })
    expect(marks['2026-12-05']).toEqual({
      hasOrders: true,
      important: false,
      prepAhead: false,
    })
    expect(Object.keys(marks).sort()).toEqual(['2026-12-05', '2026-12-31'])
  })
})

describe('tickets', () => {
  it('groups unpaid tickets by customer with totals', async () => {
    const a = await getOrCreateCustomerByName('Zoe')
    const b = await getOrCreateCustomerByName('Ana')
    await createTicket({ customer: a.id, amountCents: 500 })
    await createTicket({ customer: a.id, amountCents: 250 })
    const t = await createTicket({ customer: b.id, amountCents: 100 })
    const paid = await createTicket({ customer: b.id, amountCents: 900 })
    await markTicketPaid(paid.id)
    const groups = await queryPendingTickets(db())
    expect(groups.map((g) => g.customer?.name)).toEqual(['Ana', 'Zoe'])
    expect(groups.map((g) => g.totalCents)).toEqual([100, 750])
    expect(groups[0].tickets[0].id).toBe(t.id)
  })
})

describe('suggestions', () => {
  it('suggests customers, prefix first, accent-insensitive', async () => {
    await getOrCreateCustomerByName('Maria Lopez')
    await getOrCreateCustomerByName('Ana Maria')
    await getOrCreateCustomerByName('Pere')
    const r = await querySuggestCustomers(db(), 'MARÍ')
    expect(r.map((c) => c.name)).toEqual(['Maria Lopez', 'Ana Maria'])
  })

  it('item suggestions: latest use per name carries measure and prepDayBefore', async () => {
    const c = await getOrCreateCustomerByName('Ana')
    await createOrder(
      { customer: c.id, pickupAt: '2026-12-17T10:00:00.000Z' },
      [{ name: 'Entrecot', measure: 'unit', prepDayBefore: false }],
    )
    await new Promise((r) => setTimeout(r, 5))
    await createOrder(
      { customer: c.id, pickupAt: '2026-12-18T10:00:00.000Z' },
      [
        { name: 'entrecot ', measure: 'weight', prepDayBefore: true },
        { name: 'Pollo', measure: 'unit' },
      ],
    )
    const r = await querySuggestItems(db(), 'entre')
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ measure: 'weight', prepDayBefore: true })
    expect(
      (await querySuggestItems(db(), '')).map((s) => s.name).sort(),
    ).toEqual(['Pollo', 'entrecot'])
  })
})

describe('customer orders', () => {
  it('lists newest first', async () => {
    const c = await getOrCreateCustomerByName('Ana')
    await createOrder(
      { customer: c.id, pickupAt: '2026-12-17T10:00:00.000Z' },
      [{ name: 'A', measure: 'unit' }],
    )
    await createOrder(
      { customer: c.id, pickupAt: '2026-12-20T10:00:00.000Z' },
      [{ name: 'A', measure: 'unit' }],
    )
    const r = await queryCustomerOrders(db(), c.id)
    expect(r.map((o) => o.pickupAt.slice(0, 10))).toEqual([
      '2026-12-20',
      '2026-12-17',
    ])
  })
})

describe('archive and counts', () => {
  async function seed() {
    const ana = await getOrCreateCustomerByName('Ana Pérez')
    const pau = await getOrCreateCustomerByName('Pau')
    const mk = async (c: string, at: string) =>
      (
        await createOrder({ customer: c, pickupAt: at }, [
          { name: 'A', measure: 'unit' },
        ])
      ).order
    const o1 = await mk(ana.id, '2026-12-05T10:00:00.000Z')
    const o2 = await mk(pau.id, '2026-12-10T10:00:00.000Z')
    const o3 = await mk(ana.id, '2026-11-30T23:30:00.000Z') // Madrid: 1 Dec
    const o4 = await mk(ana.id, '2026-12-20T10:00:00.000Z') // stays pending
    await deliverOrder(o1.id)
    await cancelOrder(o2.id)
    await deliverOrder(o3.id)
    return { ana, pau, o1, o2, o3, o4 }
  }

  it('lists delivered and cancelled newest first, never pending', async () => {
    const { o1, o2, o3 } = await seed()
    const r = await queryArchivedOrders(db(), {})
    expect(r.map((d) => d.order.id)).toEqual([o2.id, o1.id, o3.id])
    expect(r[0].customer?.name).toBe('Pau')
    expect(r[0].items).toHaveLength(1)
  })

  it('filters by customer nameKey substring and inclusive Madrid day range', async () => {
    const { o1, o3 } = await seed()
    expect(
      (await queryArchivedOrders(db(), { text: 'PEREZ' })).map(
        (d) => d.order.id,
      ),
    ).toEqual([o1.id, o3.id])
    const range = await queryArchivedOrders(db(), {
      fromDay: '2026-12-01',
      toDay: '2026-12-05',
    })
    expect(range.map((d) => d.order.id)).toEqual([o1.id, o3.id])
    expect(
      await queryArchivedOrders(db(), {
        fromDay: '2026-12-06',
        toDay: '2026-12-09',
      }),
    ).toEqual([])
  })

  it('counts delivered orders of the Madrid month', async () => {
    await seed()
    expect(await queryMonthDeliveredCount(db(), '2026-12')).toBe(2)
    expect(await queryMonthDeliveredCount(db(), '2026-11')).toBe(0)
  })

  it('customer and customer tickets (paid and pending, newest first)', async () => {
    const a = await getOrCreateCustomerByName('Ana')
    expect((await queryCustomer(db(), a.id))?.name).toBe('Ana')
    expect(await queryCustomer(db(), 'nope')).toBeUndefined()
    const t1 = await createTicket({ customer: a.id, amountCents: 1 })
    await new Promise((r) => setTimeout(r, 5))
    const t2 = await createTicket({ customer: a.id, amountCents: 2 })
    await markTicketPaid(t1.id)
    const r = await queryCustomerTickets(db(), a.id)
    expect(r.map((t) => t.id)).toEqual([t2.id, t1.id])
  })
})
