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
  queryRangeMarks,
  queryOrderDetail,
  queryPaidTickets,
  queryPendingTickets,
  queryPrepAheadItems,
  querySuggestCustomers,
  queryProducts,
  querySuggestItems,
} from './hooks'
import { getOrCreateCustomerByName } from './repo/customers'
import { createProduct, deleteProduct } from './repo/products'
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

describe('month marks and archived orders', () => {
  async function seed() {
    const c = await getOrCreateCustomerByName('Ana')
    const pending = await createOrder(
      { customer: c.id, pickupAt: '2026-12-10T10:00:00.000Z' },
      [{ name: 'A', measure: 'unit' }],
    )
    const delivered = await createOrder(
      {
        customer: c.id,
        pickupAt: '2026-12-11T10:00:00.000Z',
        important: true,
      },
      [{ name: 'B', measure: 'unit', prepDayBefore: true }],
    )
    await deliverOrder(delivered.order.id)
    const cancelled = await createOrder(
      { customer: c.id, pickupAt: '2026-12-12T10:00:00.000Z' },
      [{ name: 'C', measure: 'unit' }],
    )
    await cancelOrder(cancelled.order.id)
    return { pending }
  }

  it('by default only pending orders are marked', async () => {
    await seed()
    const marks = await queryMonthMarks(db(), '2026-12')
    expect(Object.keys(marks)).toEqual(['2026-12-10'])
    expect(marks['2026-12-10'].hasOrders).toBe(true)
  })

  it('includeArchived adds delivered orders to hasOrders only', async () => {
    await seed()
    const marks = await queryMonthMarks(db(), '2026-12', {
      includeArchived: true,
    })
    expect(Object.keys(marks).sort()).toEqual(['2026-12-10', '2026-12-11'])
    expect(marks['2026-12-11']).toEqual({
      hasOrders: true,
      important: false,
      prepAhead: false,
    })
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

  it('item suggestions come only from the catalogue, with the price', async () => {
    await createProduct({
      name: 'Entrecot',
      measure: 'weight',
      prepDayBefore: true,
      unitPriceCents: 2490,
    })
    await createProduct({
      name: 'Pollo',
      measure: 'unit',
      prepDayBefore: false,
    })
    expect(await querySuggestItems(db(), 'ENTRÉ')).toEqual([
      {
        name: 'Entrecot',
        measure: 'weight',
        prepDayBefore: true,
        unitPriceCents: 2490,
      },
    ])
    expect(
      (await querySuggestItems(db(), '')).map((s) => s.name).sort(),
    ).toEqual(['Entrecot', 'Pollo'])
  })

  it('a deleted product no longer shows in the suggestions', async () => {
    const p = await createProduct({
      name: 'Entrecot',
      measure: 'unit',
      prepDayBefore: false,
    })
    await deleteProduct(p.id)
    expect(await querySuggestItems(db(), 'entre')).toEqual([])
    expect(await queryProducts(db())).toEqual([])
  })

  it('items without a catalogue entry are not suggested', async () => {
    const c = await getOrCreateCustomerByName('Ana')
    await createOrder(
      { customer: c.id, pickupAt: '2026-12-17T10:00:00.000Z' },
      [{ name: 'Costilla', measure: 'unit' }],
    )
    expect((await querySuggestItems(db(), 'cost')).map((s) => s.name)).toEqual([
      'Costilla',
    ])
    // Wiping the catalogue leaves the item orphaned: nothing to suggest.
    await db().products.clear()
    expect(await querySuggestItems(db(), 'cost')).toEqual([])
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

  it('filters archived orders by customer id, combined with the day range', async () => {
    const { ana, o1, o3 } = await seed()
    expect(
      (await queryArchivedOrders(db(), { customerId: ana.id })).map(
        (d) => d.order.id,
      ),
    ).toEqual([o1.id, o3.id])
    expect(
      (
        await queryArchivedOrders(db(), {
          customerId: ana.id,
          fromDay: '2026-12-05',
        })
      ).map((d) => d.order.id),
    ).toEqual([o1.id])
  })

  it('counts delivered orders of the Madrid month', async () => {
    await seed()
    expect(await queryMonthDeliveredCount(db(), '2026-12')).toBe(2)
    expect(await queryMonthDeliveredCount(db(), '2026-11')).toBe(0)
  })

  it('customer and customer tickets (paid and pending, newest first)', async () => {
    const a = await getOrCreateCustomerByName('Ana')
    expect((await queryCustomer(db(), a.id))?.name).toBe('Ana')
    expect(await queryCustomer(db(), 'nope')).toBeNull()
    const gone = await getOrCreateCustomerByName('Gone')
    await db().customers.update(gone.id, { deleted: true })
    expect(await queryCustomer(db(), gone.id)).toBeNull()
    await db().customers.update(a.id, { mergedInto: 'other' })
    expect(await queryCustomer(db(), a.id)).toBeNull()
    await db().customers.update(a.id, { mergedInto: '' })
    expect(await queryOrderDetail(db(), 'nope')).toBeNull()
    const t1 = await createTicket({ customer: a.id, amountCents: 1 })
    await new Promise((r) => setTimeout(r, 5))
    const t2 = await createTicket({ customer: a.id, amountCents: 2 })
    await markTicketPaid(t1.id)
    const r = await queryCustomerTickets(db(), a.id)
    expect(r.map((t) => t.id)).toEqual([t2.id, t1.id])
  })
})

describe('paid tickets', () => {
  async function paidAt(amount: number, customerId: string, at: string) {
    const t = await createTicket({ customer: customerId, amountCents: amount })
    await markTicketPaid(t.id)
    await db().tickets.update(t.id, { paidAt: at })
    return t
  }

  it('lists only paid, live tickets, newest payment first, with the customer', async () => {
    const ana = await getOrCreateCustomerByName('Ana')
    const zoe = await getOrCreateCustomerByName('Zoe')
    const older = await paidAt(100, ana.id, '2026-11-10T10:00:00.000Z')
    const newer = await paidAt(200, zoe.id, '2026-11-20T10:00:00.000Z')
    await createTicket({ customer: ana.id, amountCents: 999 })
    const rows = await queryPaidTickets(db())
    expect(rows.map((r) => r.ticket.id)).toEqual([newer.id, older.id])
    expect(rows.map((r) => r.customer?.name)).toEqual(['Zoe', 'Ana'])
  })

  it('filters by customer id, combined with text', async () => {
    const ana = await getOrCreateCustomerByName('Ana Puig')
    const zoe = await getOrCreateCustomerByName('Zoe')
    await paidAt(100, ana.id, '2026-11-10T10:00:00.000Z')
    await paidAt(200, zoe.id, '2026-11-20T10:00:00.000Z')
    const rows = await queryPaidTickets(db(), { customerId: zoe.id })
    expect(rows.map((r) => r.ticket.amountCents)).toEqual([200])
    expect(
      await queryPaidTickets(db(), { customerId: zoe.id, text: 'ana' }),
    ).toEqual([])
  })

  it('filters by customer nameKey', async () => {
    const ana = await getOrCreateCustomerByName('Ana Puig')
    const zoe = await getOrCreateCustomerByName('Zoe')
    await paidAt(100, ana.id, '2026-11-10T10:00:00.000Z')
    await paidAt(200, zoe.id, '2026-11-20T10:00:00.000Z')
    const rows = await queryPaidTickets(db(), { text: 'ANÀ' })
    expect(rows.map((r) => r.customer?.name)).toEqual(['Ana Puig'])
  })

  it('filters by Madrid days: a payment at 00:30 Madrid counts on its own day', async () => {
    const ana = await getOrCreateCustomerByName('Ana')
    // 2026-11-17 00:30 Madrid (winter, UTC+1) is 2026-11-16T23:30Z.
    await paidAt(100, ana.id, '2026-11-16T23:30:00.000Z')
    // 2026-11-16 23:59 Madrid is 2026-11-16T22:59Z: still the 16th.
    await paidAt(200, ana.id, '2026-11-16T22:59:00.000Z')
    const day17 = await queryPaidTickets(db(), {
      from: '2026-11-17',
      to: '2026-11-17',
    })
    expect(day17.map((r) => r.ticket.amountCents)).toEqual([100])
    const day16 = await queryPaidTickets(db(), {
      from: '2026-11-16',
      to: '2026-11-16',
    })
    expect(day16.map((r) => r.ticket.amountCents)).toEqual([200])
  })

  it('the range is inclusive on both ends', async () => {
    const ana = await getOrCreateCustomerByName('Ana')
    await paidAt(1, ana.id, '2026-11-10T11:00:00.000Z')
    await paidAt(2, ana.id, '2026-11-12T11:00:00.000Z')
    await paidAt(3, ana.id, '2026-11-13T11:00:00.000Z')
    const rows = await queryPaidTickets(db(), {
      from: '2026-11-10',
      to: '2026-11-12',
    })
    expect(rows.map((r) => r.ticket.amountCents).sort()).toEqual([1, 2])
  })

  it('a range leaves out tickets without a payment date', async () => {
    const ana = await getOrCreateCustomerByName('Ana')
    const t = await createTicket({ customer: ana.id, amountCents: 5 })
    await db().tickets.update(t.id, { paid: true })
    expect(await queryPaidTickets(db())).toHaveLength(1)
    expect(await queryPaidTickets(db(), { from: '2026-11-01' })).toHaveLength(0)
  })
})

describe('range marks', () => {
  it('give the same as month marks over a month, and span months', async () => {
    const c = await getOrCreateCustomerByName('Ana')
    await createOrder(
      { customer: c.id, pickupAt: '2026-12-31T10:00:00.000Z', important: true },
      [{ name: 'A', measure: 'unit', prepDayBefore: true }],
    )
    await createOrder(
      { customer: c.id, pickupAt: '2026-12-05T10:00:00.000Z' },
      [{ name: 'B', measure: 'unit' }],
    )
    await createOrder(
      { customer: c.id, pickupAt: '2027-01-01T10:00:00.000Z' },
      [{ name: 'D', measure: 'unit' }],
    )
    const month = await queryMonthMarks(db(), '2026-12')
    expect(await queryRangeMarks(db(), '2026-12-01', '2026-12-31')).toEqual(
      month,
    )
    const wide = await queryRangeMarks(db(), '2026-11-30', '2027-01-03')
    expect(Object.keys(wide).sort()).toEqual([
      '2026-12-05',
      '2026-12-31',
      '2027-01-01',
    ])
    expect(wide['2026-12-31']).toEqual(month['2026-12-31'])
  })
})
