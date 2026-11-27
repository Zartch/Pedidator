import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { isPrepared } from '@shared/progress'
import { closeSession, requireSession, startSession } from '../session'
import { getOrCreateCustomerByName } from './customers'
import { getOrderItems, setItemDone, reorderItems } from './orderItems'
import {
  cancelOrder,
  createOrder,
  deleteOrder,
  deliverOrder,
  deliverOrderWithTicket,
  getOrder,
  saveOrder,
} from './orders'

let n = 0
let customerId: string
beforeEach(async () => {
  await startSession({ companyId: `ord${n++}`, userId: 'u', syncEnabled: true })
  customerId = (await getOrCreateCustomerByName('Ana')).id
})
afterEach(closeSession)

const PICKUP = '2026-12-17T09:30:00.000Z'
const make = () =>
  createOrder({ customer: customerId, pickupAt: PICKUP }, [
    { name: 'Entrecot', measure: 'weight', orderedGrams: 750 },
    { name: 'Pollo', measure: 'unit', quantity: 2, prepDayBefore: true },
  ])

describe('order repo', () => {
  it('creates order and items in order', async () => {
    const { order, items } = await make()
    expect(order.status).toBe('pending')
    expect(items.map((i) => i.position)).toEqual([0, 1])
    expect(await getOrderItems(order.id)).toHaveLength(2)
  })

  it('last item done makes the order prepared; undoing reverts', async () => {
    const { order, items } = await make()
    await setItemDone(items[0].id, true)
    expect(isPrepared(await getOrderItems(order.id))).toBe(false)
    await setItemDone(items[1].id, true)
    expect(isPrepared(await getOrderItems(order.id))).toBe(true)
    await setItemDone(items[1].id, false)
    expect(isPrepared(await getOrderItems(order.id))).toBe(false)
  })

  it('deliver and cancel change status; delivered sets deliveredAt', async () => {
    const { order } = await make()
    const d = await deliverOrder(order.id)
    expect(d.status).toBe('delivered')
    expect(d.deliveredAt).toBeTruthy()
    expect((await cancelOrder(order.id)).status).toBe('cancelled')
  })

  it('deliverOrderWithTicket delivers and creates the pending ticket of the same customer', async () => {
    const { db } = requireSession()
    const { order } = await make()
    const r = await deliverOrderWithTicket(order.id, { amountCents: 1250, notes: ' resto ' })
    expect(r.order.status).toBe('delivered')
    const tickets = await db.tickets.toArray()
    expect(tickets).toHaveLength(1)
    expect(tickets[0]).toMatchObject({
      customer: customerId,
      amountCents: 1250,
      notes: 'resto',
      paid: false,
    })
  })

  it('deliverOrderWithTicket rejects an amount that is not an integer greater than 0', async () => {
    const { db } = requireSession()
    const { order } = await make()
    for (const amountCents of [0, -5, 1.5, Number.NaN])
      await expect(deliverOrderWithTicket(order.id, { amountCents })).rejects.toThrow()
    expect((await getOrder(order.id))?.status).toBe('pending')
    expect(await db.tickets.count()).toBe(0)
  })

  it('deliverOrderWithTicket leaves the order pending if the ticket cannot be created', async () => {
    const { db } = requireSession()
    const { order } = await make()
    const fail = () => {
      throw new Error('boom')
    }
    db.tickets.hook('creating', fail)
    await expect(deliverOrderWithTicket(order.id, { amountCents: 500 })).rejects.toThrow()
    db.tickets.hook('creating').unsubscribe(fail)
    expect((await getOrder(order.id))?.status).toBe('pending')
    expect((await db.orders.get(order.id))?.deliveredAt).toBeFalsy()
  })

  it('deleteOrder soft-deletes order and items; not-yet-uploaded leaves no ops', async () => {
    const { db } = requireSession()
    const { order, items } = await make()
    await deleteOrder(order.id)
    expect(await getOrder(order.id)).toBeUndefined()
    expect(await getOrderItems(order.id)).toEqual([])
    for (const i of items)
      expect((await db.order_items.get(i.id))?.deleted).toBe(true)
    const ops = await db.outbox.toArray()
    // The customer and the two catalogue products created along with the order.
    expect(ops.map((o) => o.collection).sort()).toEqual([
      'customers',
      'products',
      'products',
    ])
  })

  it('deleteOrder of an uploaded order queues one delete for the order only', async () => {
    const { db } = requireSession()
    const { order, items } = await make()
    await db.outbox.clear()
    await db.orders.update(order.id, { version: 2 })
    await db.order_items.bulkUpdate(
      items.map((i) => ({ key: i.id, changes: { version: 1 } })),
    )
    await setItemDone(items[0].id, true)
    await deleteOrder(order.id)
    const ops = await db.outbox.toArray()
    expect(ops).toHaveLength(1)
    expect(ops[0]).toMatchObject({
      collection: 'orders',
      kind: 'delete',
      baseVersion: 2,
    })
  })

  it('saveOrder updates, adds and removes items', async () => {
    const { order, items } = await make()
    await saveOrder(order.id, { important: true }, [
      { id: items[1].id, name: 'Pollo entero', measure: 'unit', quantity: 3 },
      { name: 'Chorizo', measure: 'unit' },
    ])
    expect((await getOrder(order.id))?.important).toBe(true)
    const now = await getOrderItems(order.id)
    expect(now.map((i) => i.name)).toEqual(['Pollo entero', 'Chorizo'])
    expect(now[0].quantity).toBe(3)
    expect(now.map((i) => i.position)).toEqual([0, 1])
  })

  it('reorderItems rewrites positions', async () => {
    const { order, items } = await make()
    await reorderItems(order.id, [items[1].id, items[0].id])
    expect((await getOrderItems(order.id)).map((i) => i.name)).toEqual([
      'Pollo',
      'Entrecot',
    ])
  })
})
