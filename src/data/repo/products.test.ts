import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { closeSession, requireSession, startSession } from '../session'
import { getOrCreateCustomerByName } from './customers'
import { getOrderItems } from './orderItems'
import { createOrder, saveOrder } from './orders'
import {
  createProduct,
  deleteProduct,
  ensureProductsForItems,
  findProductByName,
  updateProduct,
} from './products'

let n = 0
let customerId: string
beforeEach(async () => {
  await startSession({ companyId: `prd${n++}`, userId: 'u', syncEnabled: true })
  customerId = (await getOrCreateCustomerByName('Ana')).id
})
afterEach(closeSession)

const PICKUP = '2026-12-17T09:30:00.000Z'
const liveProducts = async () =>
  (await requireSession().db.products.toArray()).filter((p) => !p.deleted)

describe('product repo', () => {
  it('creates a product, finds it by normalised name and queues it in the outbox', async () => {
    const p = await createProduct({
      name: '  Entrecot  de ternera ',
      measure: 'weight',
      prepDayBefore: true,
      unitPriceCents: 2490,
    })
    expect(p.name).toBe('Entrecot de ternera')
    expect(p.nameKey).toBe('entrecot de ternera')
    expect((await findProductByName('ENTRECOT DE TERNERA'))?.id).toBe(p.id)
    const ops = await requireSession().db.outbox.toArray()
    expect(ops.map((o) => [o.collection, o.kind]).filter(([c]) => c === 'products')).toEqual([['products', 'create']])
  })

  it('renaming to a name already used by another live product is an error', async () => {
    await createProduct({ name: 'Entrecot', measure: 'unit', prepDayBefore: false })
    const b = await createProduct({ name: 'Pollo', measure: 'unit', prepDayBefore: false })
    await expect(updateProduct(b.id, { name: ' entrecot ' })).rejects.toThrow()
    await expect(updateProduct(b.id, { name: '  ' })).rejects.toThrow()
    await expect(
      createProduct({ name: 'ENTRECOT', measure: 'unit', prepDayBefore: false }),
    ).rejects.toThrow()
    // Changing only the case of its own name is fine and recomputes nameKey.
    const renamed = await updateProduct(b.id, { name: 'POLLO' })
    expect(renamed.name).toBe('POLLO')
    expect(renamed.nameKey).toBe('pollo')
  })

  it('a deleted product frees its name', async () => {
    const a = await createProduct({ name: 'Entrecot', measure: 'unit', prepDayBefore: false })
    await deleteProduct(a.id)
    expect(await findProductByName('entrecot')).toBeUndefined()
    await createProduct({ name: 'Entrecot', measure: 'unit', prepDayBefore: false })
    expect(await liveProducts()).toHaveLength(1)
  })

  it('saving an order with a new name creates the product; an existing one is not duplicated', async () => {
    await createOrder({ customer: customerId, pickupAt: PICKUP }, [
      { name: 'Entrecot', measure: 'weight', prepDayBefore: true },
    ])
    let products = await liveProducts()
    expect(products).toHaveLength(1)
    expect(products[0]).toMatchObject({
      name: 'Entrecot',
      measure: 'weight',
      prepDayBefore: true,
    })
    expect(products[0].unitPriceCents ?? null).toBeNull()

    await createOrder({ customer: customerId, pickupAt: PICKUP }, [
      { name: ' entrecot ', measure: 'unit' },
      { name: 'Pollo', measure: 'unit' },
      { name: 'POLLO', measure: 'unit' },
    ])
    products = await liveProducts()
    expect(products.map((p) => p.nameKey).sort()).toEqual(['entrecot', 'pollo'])
  })

  it('saveOrder with a new item name also creates the product', async () => {
    const { order } = await createOrder({ customer: customerId, pickupAt: PICKUP }, [
      { name: 'Entrecot', measure: 'unit' },
    ])
    const [item] = await getOrderItems(order.id)
    await saveOrder(order.id, {}, [
      { id: item.id, name: 'Entrecot', measure: 'unit' },
      { name: 'Chuletas', measure: 'weight' },
    ])
    expect((await liveProducts()).map((p) => p.nameKey).sort()).toEqual([
      'chuletas',
      'entrecot',
    ])
  })

  it('editing or deleting a product does not change the items already saved', async () => {
    const { order } = await createOrder({ customer: customerId, pickupAt: PICKUP }, [
      { name: 'Entrecot', measure: 'unit', prepDayBefore: false },
    ])
    const product = await findProductByName('Entrecot')
    expect(product).toBeDefined()
    await updateProduct(product!.id, {
      name: 'Entrecot de ternera',
      measure: 'weight',
      prepDayBefore: true,
      unitPriceCents: 3000,
    })
    await deleteProduct(product!.id)
    const [item] = await getOrderItems(order.id)
    expect(item).toMatchObject({
      name: 'Entrecot',
      measure: 'unit',
      prepDayBefore: false,
    })
    expect(item.unitPriceCents ?? null).toBeNull()
  })

  it('ensureProductsForItems ignores empty names', async () => {
    expect(await ensureProductsForItems([{ name: '   ', measure: 'unit' }])).toEqual([])
  })
})
