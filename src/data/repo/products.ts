import { nameKey } from '@shared/nameKey'
import type { Measure, Product } from '@shared/types'
import { create, softDelete, update, writeTx } from '../mutate'
import { requireSession } from '../session'

export type ProductFields = {
  name: string
  measure: Measure
  prepDayBefore: boolean
  unitPriceCents?: number | null
  notes?: string
}

const clean = (name: string) => name.trim().replace(/\s+/g, ' ')

/** Live product with this normalised name, if any. */
export async function findProductByName(
  name: string,
): Promise<Product | undefined> {
  const { db } = requireSession()
  const key = nameKey(name)
  if (!key) return undefined
  const matches = await db.products.where('nameKey').equals(key).toArray()
  return matches.find((p) => !p.deleted)
}

export async function getProduct(id: string): Promise<Product | undefined> {
  const { db } = requireSession()
  const p = await db.products.get(id)
  return p && !p.deleted ? p : undefined
}

/** Throws on an empty name or one already used by another live product. */
export async function createProduct(fields: ProductFields): Promise<Product> {
  const { db, ctx } = requireSession()
  const name = clean(fields.name)
  const key = nameKey(name)
  if (!key) throw new Error('Product name is empty')
  return writeTx(db, async () => {
    if (await findProductByName(name))
      throw new Error('Product name already in use')
    return create(db, ctx, 'products', {
      name,
      nameKey: key,
      measure: fields.measure,
      prepDayBefore: fields.prepDayBefore,
      unitPriceCents: fields.unitPriceCents ?? null,
      notes: fields.notes?.trim() ?? '',
    })
  })
}

/** Recomputes `nameKey` when the name changes. Throws on an empty or duplicated name. */
export async function updateProduct(
  id: string,
  fields: Partial<ProductFields>,
): Promise<Product> {
  const { db, ctx } = requireSession()
  const patch: Parameters<typeof update<'products'>>[4] = {}
  if (fields.measure !== undefined) patch.measure = fields.measure
  if (fields.prepDayBefore !== undefined)
    patch.prepDayBefore = fields.prepDayBefore
  if (fields.unitPriceCents !== undefined)
    patch.unitPriceCents = fields.unitPriceCents
  if (fields.notes !== undefined) patch.notes = fields.notes.trim()
  return writeTx(db, async () => {
    if (fields.name !== undefined) {
      const name = clean(fields.name)
      const key = nameKey(name)
      if (!key) throw new Error('Product name is empty')
      const other = await findProductByName(name)
      if (other && other.id !== id)
        throw new Error('Product name already in use')
      patch.name = name
      patch.nameKey = key
    }
    return update(db, ctx, 'products', id, patch)
  })
}

export function deleteProduct(id: string): Promise<void> {
  const { db, ctx } = requireSession()
  return softDelete(db, ctx, 'products', id)
}

/**
 * Creates the catalogue entry of every item whose `nameKey` is not there yet
 * (no price). Returns the products created.
 */
export async function ensureProductsForItems(
  items: { name: string; measure: Measure; prepDayBefore?: boolean }[],
): Promise<Product[]> {
  const { db, ctx } = requireSession()
  return writeTx(db, async () => {
    const created: Product[] = []
    for (const item of items) {
      const name = clean(item.name)
      const key = nameKey(name)
      if (!key || (await findProductByName(name))) continue
      created.push(
        await create(db, ctx, 'products', {
          name,
          nameKey: key,
          measure: item.measure,
          prepDayBefore: item.prepDayBefore ?? false,
          unitPriceCents: null,
          notes: '',
        }),
      )
    }
    return created
  })
}
