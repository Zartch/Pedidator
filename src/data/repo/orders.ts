import type { Order, OrderItem, Ticket } from '@shared/types'
import { create, update, softDelete, writeTx } from '../mutate'
import { requireSession } from '../session'
import {
  addItem,
  getOrderItems,
  updateItem,
  type ItemInput,
} from './orderItems'
import { ensureProductsForItems } from './products'
import { createTicket } from './tickets'

export type OrderFields = {
  customer: string
  /** UTC ISO instant. */
  pickupAt: string
  important?: boolean
  notes?: string
}

export type SaveOrderItem = ItemInput & { id?: string }

export async function getOrder(id: string): Promise<Order | undefined> {
  const { db } = requireSession()
  const o = await db.orders.get(id)
  return o && !o.deleted ? o : undefined
}

/** Creates an order and its items in one transaction. */
export async function createOrder(
  fields: OrderFields,
  items: ItemInput[],
): Promise<{ order: Order; items: OrderItem[] }> {
  const { db, ctx } = requireSession()
  return writeTx(db, async () => {
    const order = await create(db, ctx, 'orders', {
      customer: fields.customer,
      pickupAt: fields.pickupAt,
      status: 'pending',
      important: fields.important ?? false,
      notes: fields.notes?.trim() ?? '',
    })
    const created: OrderItem[] = []
    for (const [i, input] of items.entries())
      created.push(await addItem(order.id, input, i))
    await ensureProductsForItems(items)
    return { order, items: created }
  })
}

export function updateOrder(
  id: string,
  fields: Partial<OrderFields>,
): Promise<Order> {
  const { db, ctx } = requireSession()
  const patch = { ...fields }
  if (patch.notes !== undefined) patch.notes = patch.notes.trim()
  return update(db, ctx, 'orders', id, patch)
}

/**
 * Saves an existing order and reconciles its items with `items` (in order):
 * items with a known id are updated, new ones created, missing ones deleted.
 */
export async function saveOrder(
  id: string,
  fields: Partial<OrderFields>,
  items: SaveOrderItem[],
): Promise<void> {
  const { db, ctx } = requireSession()
  await writeTx(db, async () => {
    await updateOrder(id, fields)
    const existing = await getOrderItems(id)
    const keep = new Set(items.flatMap((i) => (i.id ? [i.id] : [])))
    for (const old of existing) {
      if (!keep.has(old.id)) await softDelete(db, ctx, 'order_items', old.id)
    }
    const known = new Set(existing.map((i) => i.id))
    for (const [pos, { id: itemId, ...input }] of items.entries()) {
      if (itemId && known.has(itemId))
        await updateItem(itemId, { ...input, position: pos })
      else await addItem(id, input, pos)
    }
    await ensureProductsForItems(items)
  })
}

export function deliverOrder(id: string): Promise<Order> {
  const { db, ctx } = requireSession()
  return update(db, ctx, 'orders', id, {
    status: 'delivered',
    deliveredAt: new Date().toISOString(),
  })
}

/**
 * Delivers the order and leaves `amountCents` owed as a pending ticket of the
 * same customer, in one transaction: if the ticket cannot be created the
 * order stays as it was.
 */
export async function deliverOrderWithTicket(
  id: string,
  fields: { amountCents: number; notes?: string },
): Promise<{ order: Order; ticket: Ticket }> {
  if (!Number.isSafeInteger(fields.amountCents) || fields.amountCents <= 0)
    throw new Error('amountCents must be an integer greater than 0')
  const { db } = requireSession()
  return writeTx(db, async () => {
    const current = await getOrder(id)
    if (!current) throw new Error('order not found')
    const order = await deliverOrder(id)
    const ticket = await createTicket({
      customer: current.customer,
      amountCents: fields.amountCents,
      notes: fields.notes,
    })
    return { order, ticket }
  })
}

/** Back from delivered/cancelled to pending. */
export function reopenOrder(id: string): Promise<Order> {
  const { db, ctx } = requireSession()
  return update(db, ctx, 'orders', id, { status: 'pending', deliveredAt: '' })
}

export function cancelOrder(id: string): Promise<Order> {
  const { db, ctx } = requireSession()
  return update(db, ctx, 'orders', id, { status: 'cancelled' })
}

/**
 * Deletes the order and its items (same transaction). The server cascades the
 * delete itself, so the items get no delete op of their own.
 */
export async function deleteOrder(id: string): Promise<void> {
  const { db, ctx } = requireSession()
  await writeTx(db, async () => {
    for (const item of await getOrderItems(id)) {
      await softDelete(db, ctx, 'order_items', item.id, { skipOutbox: true })
    }
    await softDelete(db, ctx, 'orders', id)
  })
}
