import 'fake-indexeddb/auto'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import CustomerPage from './CustomerPage'
import { getCustomer, getOrCreateCustomerByName } from '@/data/repo/customers'
import { createOrder, deliverOrder } from '@/data/repo/orders'
import { createTicket, markTicketPaid } from '@/data/repo/tickets'
import { closeSession, requireSession, startSession } from '@/data/session'

let n = 0
let customerId = ''

beforeEach(async () => {
  await startSession({ companyId: `cc${n++}`, userId: 'u', syncEnabled: false })
  customerId = (await getOrCreateCustomerByName('Bar La Plaça')).id
})
afterEach(() => {
  cleanup()
  closeSession()
})

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/customers/${customerId}`]}>
      <Routes>
        <Route path="/customers/:id" element={<CustomerPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CustomerPage contact fields', () => {
  it('saves the phone explicitly and keeps it after reopening the file', async () => {
    renderPage()
    const phone = (await screen.findByLabelText('Telèfon')) as HTMLInputElement
    fireEvent.change(phone, { target: { value: '93 555 01 42' } })

    // Enter does not save: nothing is stored yet.
    fireEvent.keyDown(phone, { key: 'Enter' })
    expect((await getCustomer(customerId))?.phone).toBeUndefined()

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(async () => {
      expect((await getCustomer(customerId))?.phone).toBe('93 555 01 42')
    })

    cleanup()
    renderPage()
    const reopened = (await screen.findByLabelText('Telèfon')) as HTMLInputElement
    expect(reopened.value).toBe('93 555 01 42')
  })

  it('saves the notes together with the phone', async () => {
    renderPage()
    const notes = (await screen.findByLabelText('Notes')) as HTMLTextAreaElement
    fireEvent.change(notes, { target: { value: 'Recogen por la puerta de atrás' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(async () => {
      expect((await getCustomer(customerId))?.notes).toBe('Recogen por la puerta de atrás')
    })
  })
})

describe('CustomerPage not found', () => {
  it('shows "Client no trobat" with a link to the list for an unknown customer', async () => {
    customerId = 'nope'
    renderPage()
    expect(await screen.findByText('Client no trobat')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Tornar a clients' }).getAttribute('href')).toBe(
      '/customers',
    )
  })
})

async function paidTicket(amount: number, paidAt: string) {
  const t = await createTicket({ customer: customerId, amountCents: amount })
  await markTicketPaid(t.id)
  await requireSession().db.tickets.update(t.id, { paidAt })
  return t
}

function orderHrefs(): (string | null)[] {
  return screen
    .queryAllByRole('link')
    .map((a) => a.getAttribute('href'))
    .filter((h) => (h ?? '').startsWith('/orders/'))
}

describe('CustomerPage pending-first file', () => {
  it('shows only pending orders and tickets at first', async () => {
    const pendingOrder = await createOrder(
      { customer: customerId, pickupAt: '2026-12-20T10:00:00.000Z' },
      [{ name: 'Pollo', measure: 'unit', quantity: 1 }],
    )
    const done = await createOrder(
      { customer: customerId, pickupAt: '2026-12-10T10:00:00.000Z' },
      [{ name: 'Pollo', measure: 'unit', quantity: 1 }],
    )
    await deliverOrder(done.order.id)
    await createTicket({ customer: customerId, amountCents: 1250 })
    await paidTicket(999, '2026-11-20T10:00:00.000Z')

    renderPage()
    await screen.findByText('Pendent: 12,50 €')
    expect(orderHrefs()).toEqual([`/orders/${pendingOrder.order.id}`])
    expect(screen.queryByText('9,99 €')).toBeNull()
    expect(screen.getByText('12,50 €')).toBeTruthy()
  })

  it('"Veure lliurats" shows at most 5, the most recent, with a link to explore', async () => {
    const ids: string[] = []
    for (let d = 1; d <= 7; d++) {
      const o = await createOrder(
        {
          customer: customerId,
          pickupAt: `2026-11-${String(10 + d).padStart(2, '0')}T10:00:00.000Z`,
        },
        [{ name: 'Pollo', measure: 'unit', quantity: 1 }],
      )
      await deliverOrder(o.order.id)
      ids.push(o.order.id)
    }
    renderPage()
    const button = await screen.findByRole('button', { name: 'Veure lliurats' })
    expect(button.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(button)
    await screen.findByRole('link', { name: 'Explorar' })
    expect(orderHrefs()).toEqual(
      ids
        .slice(2)
        .reverse()
        .map((id) => `/orders/${id}`),
    )
    expect(screen.getByRole('link', { name: 'Explorar' }).getAttribute('href')).toBe(
      `/archive?customer=${customerId}`,
    )
  })

  it('"Veure pagats" shows at most 5, the most recent, with the paid total', async () => {
    for (let d = 1; d <= 6; d++) {
      await paidTicket(d * 100, `2026-11-${String(10 + d).padStart(2, '0')}T10:00:00.000Z`)
    }
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Veure pagats' }))
    const total = await screen.findByTestId('paid-total')
    expect(total.textContent).toBe('Total pagat: 21,00 €')
    expect(screen.getAllByRole('button', { name: 'Torna a pendent' })).toHaveLength(5)
    expect(screen.queryByText('1,00 €')).toBeNull() // the oldest one
    expect(screen.getByText('6,00 €')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Explorar' }).getAttribute('href')).toBe(
      `/tickets?view=paid&customer=${customerId}`,
    )
  })

  it('"Marca com a pagat" takes the ticket out of the pending list', async () => {
    await createTicket({ customer: customerId, amountCents: 1250 })
    renderPage()
    await screen.findByText('Pendent: 12,50 €')
    fireEvent.click(screen.getByRole('button', { name: 'Marca com a pagat' }))
    await screen.findByText('Sense tickets pendents.')
    expect(screen.getByText('Pendent: 0,00 €')).toBeTruthy()
  })

  it('"Torna a pendent" asks for confirmation before returning the ticket', async () => {
    await paidTicket(800, '2026-11-20T10:00:00.000Z')
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Veure pagats' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Torna a pendent' }))
    const dialog = await screen.findByRole('dialog', { hidden: true })

    // Cancelling changes nothing.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel·la' }))
    expect((await requireSession().db.tickets.toArray())[0].paid).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Torna a pendent' }))
    const again = await screen.findByRole('dialog', { hidden: true })
    fireEvent.click(within(again).getByRole('button', { name: 'Torna a pendent' }))
    await screen.findByText('Pendent: 8,00 €')
    expect((await requireSession().db.tickets.toArray())[0].paid).toBe(false)
  })
})
