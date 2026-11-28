import type { Measure, OrderItem } from '@shared/types'
import { create, update, softDelete, writeTx } from '../mutate'
import { requireSession } from '../session'

export type ItemInput = {
  name: string
  measure: Measure
  quantity?: number
  orderedGrams?: number | null
  prepDayBefore?: boolean
  done?: boolean
  notes?: string
  unitPriceCents?: number | null
  weightGrams?: number | null
}

export async function getOrderItems(orderId: string): Promise<OrderItem[]> {
  const { db } = requireSession()
  const items = await db.order_items.where('order').equals(orderId).toArray()
  return items.filter((i) => !i.deleted).sort((a, b) => a.position - b.position)
}

export async function addItem(
  orderId: string,
  input: ItemInput,
  position?: number,
): Promise<OrderItem> {
  const { db, ctx } = requireSession()
  return writeTx(db, async () => {
    const pos = position ?? (await getOrderItems(orderId)).length
    return create(db, ctx, 'order_items', {
      order: orderId,
      name: input.name.trim(),
      measure: input.measure,
      quantity: input.quantity ?? 1,
      orderedGrams: input.orderedGrams ?? null,
      prepDayBefore: input.prepDayBefore ?? false,
      done: input.done ?? false,
      position: pos,
      notes: input.notes?.trim() ?? '',
      unitPriceCents: input.unitPriceCents ?? null,
      weightGrams: input.weightGrams ?? null,
    })
  })
}

export async function updateItem(
  id: string,
  fields: Partial<ItemInput> & { position?: number },
): Promise<OrderItem> {
  const { db, ctx } = requireSession()
  const patch = { ...fields }
  if (patch.name !== undefined) patch.name = patch.name.trim()
  if (patch.notes !== undefined) patch.notes = patch.notes.trim()
  return update(db, ctx, 'order_items', id, patch)
}

/** Marks or unmarks an item. "Prepared" of the order is derived, never stored. */
export function setItemDone(id: string, done: boolean): Promise<OrderItem> {
  const { db, ctx } = requireSession()
  return update(db, ctx, 'order_items', id, { done })
}

export async function deleteItem(id: string): Promise<void> {
  const { db, ctx } = requireSession()
  await softDelete(db, ctx, 'order_items', id)
}

/** Rewrites `position` so the items follow `orderedIds` (only changed ones are written). */
export async function reorderItems(
  orderId: string,
  orderedIds: string[],
): Promise<void> {
  const { db, ctx } = requireSession()
  await writeTx(db, async () => {
    const items = await getOrderItems(orderId)
    const byId = new Map(items.map((i) => [i.id, i]))
    let pos = 0
    for (const id of orderedIds) {
      const item = byId.get(id)
      if (!item) continue
      if (item.position !== pos)
        await update(db, ctx, 'order_items', id, { position: pos })
      pos++
    }
  })
}
