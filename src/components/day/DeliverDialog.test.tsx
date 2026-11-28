import 'fake-indexeddb/auto'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { closeSession, requireSession, startSession } from '@/data/session'
import { getOrCreateCustomerByName } from '@/data/repo/customers'
import { createOrder, getOrder } from '@/data/repo/orders'
import type { DayOrder } from '@/data/hooks'
import { DeliverDialog } from './DeliverDialog'

let n = 0
beforeEach(async () => {
  await startSession({ companyId: `dd${n++}`, userId: 'u1', syncEnabled: false })
})
afterEach(() => {
  cleanup()
  closeSession()
})

async function seed(): Promise<DayOrder> {
  const customer = await getOrCreateCustomerByName('Marta')
  const { order, items } = await createOrder(
    { customer: customer.id, pickupAt: '2026-12-17T09:30:00.000Z' },
    [{ name: 'Pollastre', measure: 'unit', quantity: 1 }],
  )
  return { order, customer, items }
}

describe('DeliverDialog', () => {
  it('warns when the order is not fully prepared and prefills the notes with the pickup', async () => {
    const onClose = vi.fn()
    render(<DeliverDialog data={await seed()} onClose={onClose} />)
    expect(screen.getByText(/encara no està preparat del tot/)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Lliurar i deixar a deure' }))
    expect((screen.getByLabelText('Notes') as HTMLTextAreaElement).value).toBe(
      'Encàrrec del 17/12 10:30',
    )
    expect((screen.getByLabelText('Import') as HTMLInputElement).value).toBe('')
  })

  it('shows an error and keeps the order pending when the ticket cannot be created', async () => {
    const data = await seed()
    const onClose = vi.fn()
    render(<DeliverDialog data={data} onClose={onClose} />)
    const { db } = requireSession()
    const fail = () => {
      throw new Error('boom')
    }
    db.tickets.hook('creating', fail)
    fireEvent.click(screen.getByRole('button', { name: 'Lliurar i deixar a deure' }))
    fireEvent.change(screen.getByLabelText('Import'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lliurar i crear ticket' }))
    expect(await screen.findByText("No s'ha pogut lliurar l'encàrrec")).toBeDefined()
    expect(onClose).not.toHaveBeenCalled()
    expect((await getOrder(data.order.id))?.status).toBe('pending')
    db.tickets.hook('creating').unsubscribe(fail)
  })

  it('Enter in the amount field does not submit', async () => {
    const data = await seed()
    render(<DeliverDialog data={data} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Lliurar i deixar a deure' }))
    const amount = screen.getByLabelText('Import')
    fireEvent.change(amount, { target: { value: '5' } })
    fireEvent.keyDown(amount, { key: 'Enter' })
    await waitFor(() => expect(requireSession().db.tickets.count()).resolves.toBe(0))
    expect((await getOrder(data.order.id))?.status).toBe('pending')
  })
})
