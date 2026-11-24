import { nameKey } from '@shared/nameKey'
import type { Customer } from '@shared/types'
import { create, update, writeTx } from '../mutate'
import { requireSession } from '../session'

/** Live (not deleted, not merged) customer with this normalised name, if any. */
export async function findCustomerByName(
  name: string,
): Promise<Customer | undefined> {
  const { db } = requireSession()
  const key = nameKey(name)
  if (!key) return undefined
  const matches = await db.customers.where('nameKey').equals(key).toArray()
  return matches.find((c) => !c.deleted && !c.mergedInto)
}

export async function getCustomer(id: string): Promise<Customer | undefined> {
  const { db } = requireSession()
  return db.customers.get(id)
}

/** Finds the customer by `nameKey` or creates it. Throws on an empty name. */
export async function getOrCreateCustomerByName(
  name: string,
): Promise<Customer> {
  const clean = name.trim().replace(/\s+/g, ' ')
  if (!nameKey(clean)) throw new Error('Customer name is empty')
  const { db, ctx } = requireSession()
  return writeTx(db, async () => {
    const found = await findCustomerByName(clean)
    if (found) return found
    return create(db, ctx, 'customers', {
      name: clean,
      nameKey: nameKey(clean),
    })
  })
}

export async function updateCustomer(
  id: string,
  fields: { name?: string; phone?: string; notes?: string },
): Promise<Customer> {
  const { db, ctx } = requireSession()
  const patch: Parameters<typeof update<'customers'>>[4] = {}
  if (fields.name !== undefined) {
    const clean = fields.name.trim().replace(/\s+/g, ' ')
    if (!nameKey(clean)) throw new Error('Customer name is empty')
    patch.name = clean
    patch.nameKey = nameKey(clean)
  }
  if (fields.phone !== undefined) patch.phone = fields.phone.trim()
  if (fields.notes !== undefined) patch.notes = fields.notes.trim()
  return update(db, ctx, 'customers', id, patch)
}
