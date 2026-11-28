import 'fake-indexeddb/auto'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { closeSession, requireSession, startSession } from '@/data/session'
import { getOrCreateCustomerByName } from '@/data/repo/customers'
import { createOrder } from '@/data/repo/orders'
import { ItemCheckRow } from './ItemCheckRow'

let n = 0
beforeEach(async () => {
  await startSession({ companyId: `icr${n++}`, userId: 'u1', syncEnabled: false })
})
afterEach(() => {
  cleanup()
  closeSession()
})

async function seedItem() {
  const customer = await getOrCreateCustomerByName('Marta')
  const { items } = await createOrder(
    { customer: customer.id, pickupAt: '2026-12-17T09:30:00.000Z' },
    [{ name: 'Pollastre', measure: 'unit' }],
  )
  return items[0]
}

describe('ItemCheckRow', () => {
  it('shows an alert when ticking the item fails', async () => {
    const item = await seedItem()
    const { db } = requireSession()
    db.order_items.hook('updating', () => {
      throw new Error('boom')
    })
    render(<ItemCheckRow item={item} />)
    expect(screen.queryByRole('alert')).toBeNull()
    fireEvent.click(screen.getByRole('checkbox'))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain("No s'ha pogut desar el canvi")
  })
})
