import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { closeSession, requireSession, startSession } from '../session'
import {
  getOrCreateCustomerByName,
  findCustomerByName,
  updateCustomer,
} from './customers'

let n = 0
beforeEach(async () => {
  await startSession({ companyId: `cus${n++}`, userId: 'u', syncEnabled: true })
})
afterEach(closeSession)

describe('getOrCreateCustomerByName', () => {
  it('creates a customer with its nameKey', async () => {
    const c = await getOrCreateCustomerByName('  José   Pérez ')
    expect(c.name).toBe('José Pérez')
    expect(c.nameKey).toBe('jose perez')
    expect(await requireSession().db.outbox.count()).toBe(1)
  })

  it('returns the existing customer for a differently written name', async () => {
    const a = await getOrCreateCustomerByName('José Pérez')
    const b = await getOrCreateCustomerByName('jose   PEREZ')
    expect(b.id).toBe(a.id)
    expect(await requireSession().db.customers.count()).toBe(1)
    expect(await requireSession().db.outbox.count()).toBe(1)
  })

  it('creates a new customer if the previous one was deleted', async () => {
    const { db } = requireSession()
    const a = await getOrCreateCustomerByName('Ana')
    await db.customers.update(a.id, { deleted: true })
    const b = await getOrCreateCustomerByName('Ana')
    expect(b.id).not.toBe(a.id)
  })

  it('handles ç, ñ and l·l', async () => {
    const a = await getOrCreateCustomerByName('Núria Çabrera')
    expect((await findCustomerByName('NURIA cabrera'))?.id).toBe(a.id)
    const b = await getOrCreateCustomerByName('Peña')
    expect((await findCustomerByName('pena'))?.id).toBe(b.id)
  })

  it('rejects an empty name', async () => {
    await expect(getOrCreateCustomerByName('   ')).rejects.toThrow()
  })

  it('concurrent calls with the same name create one customer', async () => {
    const [a, b] = await Promise.all([
      getOrCreateCustomerByName('Marta'),
      getOrCreateCustomerByName('marta'),
    ])
    expect(a.id).toBe(b.id)
    expect(await requireSession().db.customers.count()).toBe(1)
  })
})

describe('updateCustomer', () => {
  it('renaming updates nameKey locally but only sends name', async () => {
    const { db } = requireSession()
    const c = await getOrCreateCustomerByName('Ana')
    await db.outbox.clear()
    await db.customers.update(c.id, { version: 1 })
    await updateCustomer(c.id, { name: 'Anna Ç' })
    expect((await db.customers.get(c.id))?.nameKey).toBe('anna c')
    const [op] = await db.outbox.toArray()
    expect(op.patch).toEqual({ name: 'Anna Ç' })
  })
})
