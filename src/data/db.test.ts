import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import { openCompanyDb } from './db'

describe('Dexie version 2 upgrade', () => {
  it('fills products with one entry per distinct nameKey of live items', async () => {
    const legacy = new Dexie('pedidator-upg1')
    legacy.version(1).stores({
      customers: 'id, nameKey',
      orders: 'id, pickupAt, status, customer',
      order_items: 'id, order',
      tickets: 'id, customer, paid',
      outbox: 'opId, createdAt, [collection+recordId]',
      conflicts: 'opId',
      blobs: 'id, [collection+recordId]',
      meta: 'key',
    })
    const item = (
      id: string,
      name: string,
      created: string,
      extra: Record<string, unknown> = {},
    ) => ({
      id,
      order: 'o1',
      name,
      measure: 'unit',
      prepDayBefore: false,
      deleted: false,
      created,
      ...extra,
    })
    await legacy.table('order_items').bulkAdd([
      item('a', 'Entrecot', '2026-01-01T00:00:00.000Z'),
      item('b', ' entrecot ', '2026-02-01T00:00:00.000Z', {
        measure: 'weight',
        prepDayBefore: true,
        unitPriceCents: 999,
      }),
      item('c', 'Pollo', '2026-01-01T00:00:00.000Z'),
      item('d', 'Borrado', '2026-01-01T00:00:00.000Z', { deleted: true }),
    ])
    legacy.close()

    const db = openCompanyDb('upg1')
    const products = (await db.products.toArray()).sort((x, y) =>
      x.nameKey.localeCompare(y.nameKey),
    )
    expect(products.map((p) => p.nameKey)).toEqual(['entrecot', 'pollo'])
    // The latest use supplies the values; no price is copied.
    expect(products[0]).toMatchObject({
      name: 'entrecot',
      measure: 'weight',
      prepDayBefore: true,
      deleted: false,
      company: 'upg1',
    })
    expect(products[0].unitPriceCents).toBeUndefined()
    expect(await db.outbox.count()).toBe(0)
    db.close()
  })
})
