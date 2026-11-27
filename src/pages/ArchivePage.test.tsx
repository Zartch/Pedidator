import 'fake-indexeddb/auto'
import '@/i18n'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { closeSession, startSession } from '@/data/session'
import { getOrCreateCustomerByName } from '@/data/repo/customers'
import { cancelOrder, createOrder, deliverOrder } from '@/data/repo/orders'
import ArchivePage from './ArchivePage'

let n = 0
beforeEach(async () => {
  await startSession({
    companyId: `archive${n++}`,
    userId: 'u1',
    syncEnabled: false,
  })
})
afterEach(() => {
  cleanup()
  closeSession()
})

function renderPage(url = '/archive') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <ArchivePage />
    </MemoryRouter>,
  )
}

/** Links to orders on screen, by their visible text (customer name). */
function orderLinks(): HTMLElement[] {
  return screen
    .queryAllByRole('link')
    .filter((a) => (a.getAttribute('href') ?? '').startsWith('/orders/'))
}

describe('ArchivePage filters', () => {
  it('lists delivered and cancelled orders and filters by customer and day range', async () => {
    const ana = await getOrCreateCustomerByName('Ana Pérez')
    const joan = await getOrCreateCustomerByName('Joan Puig')

    // Madrid is UTC+1 in December: 09:30Z is 10:30 on the same day.
    const anaDelivered = await createOrder(
      { customer: ana.id, pickupAt: '2026-12-17T09:30:00.000Z' },
      [{ name: 'Entrecot', measure: 'weight', orderedGrams: 2500 }],
    )
    await deliverOrder(anaDelivered.order.id)

    const anaCancelled = await createOrder(
      { customer: ana.id, pickupAt: '2026-12-20T09:30:00.000Z' },
      [{ name: 'Pollo', measure: 'unit', quantity: 2 }],
    )
    await cancelOrder(anaCancelled.order.id)

    const joanDelivered = await createOrder(
      { customer: joan.id, pickupAt: '2026-12-17T10:00:00.000Z' },
      [{ name: 'Butifarra', measure: 'unit', quantity: 6 }],
    )
    await deliverOrder(joanDelivered.order.id)

    // Pending orders are not archived.
    await createOrder(
      { customer: joan.id, pickupAt: '2026-12-21T10:00:00.000Z' },
      [],
    )

    renderPage()

    await waitFor(() => expect(orderLinks()).toHaveLength(3))
    expect(screen.getAllByText('Ana Pérez')).toHaveLength(2)
    expect(screen.getAllByText('Joan Puig')).toHaveLength(1)
    // Quantities are shown, never prices.
    expect(screen.getByText(/Entrecot 2,5 kg/)).toBeDefined()
    expect(screen.getByText(/Butifarra 6 u/)).toBeDefined()

    const search = screen.getByRole('searchbox')

    fireEvent.change(search, { target: { value: 'joan' } })
    await waitFor(() => expect(orderLinks()).toHaveLength(1))
    expect(screen.getAllByText('Joan Puig')).toHaveLength(1)

    // Accents and case are ignored by the nameKey match.
    fireEvent.change(search, { target: { value: 'PEREZ' } })
    await waitFor(() => expect(orderLinks()).toHaveLength(2))

    fireEvent.change(search, { target: { value: 'zzz' } })
    await waitFor(() => expect(orderLinks()).toHaveLength(0))
    expect(
      screen.getByText('No hi ha encàrrecs arxivats amb aquest filtre.'),
    ).toBeDefined()

    fireEvent.change(search, { target: { value: '' } })
    await waitFor(() => expect(orderLinks()).toHaveLength(3))

    // Day range (inclusive, Madrid days).
    fireEvent.change(screen.getByLabelText('Des de'), {
      target: { value: '2026-12-18' },
    })
    fireEvent.change(screen.getByLabelText('Fins a'), {
      target: { value: '2026-12-31' },
    })
    await waitFor(() => expect(orderLinks()).toHaveLength(1))
    expect(screen.getAllByText('Ana Pérez')).toHaveLength(1)

    fireEvent.change(screen.getByLabelText('Des de'), {
      target: { value: '2026-12-17' },
    })
    fireEvent.change(screen.getByLabelText('Fins a'), {
      target: { value: '2026-12-17' },
    })
    await waitFor(() => expect(orderLinks()).toHaveLength(2))

    // Search and range combine.
    fireEvent.change(search, { target: { value: 'ana' } })
    await waitFor(() => expect(orderLinks()).toHaveLength(1))

    fireEvent.click(screen.getByRole('button', { name: 'Totes les dates' }))
    await waitFor(() => expect(orderLinks()).toHaveLength(2))
  })
})

describe('ArchivePage URL filters', () => {
  it('filters by customer, from and to from the URL, and the chip removes the customer', async () => {
    const ana = await getOrCreateCustomerByName('Ana Pérez')
    const joan = await getOrCreateCustomerByName('Joan Puig')
    for (const [c, at] of [
      [ana, '2026-12-17T09:30:00.000Z'],
      [ana, '2026-12-25T09:30:00.000Z'],
      [joan, '2026-12-17T10:00:00.000Z'],
    ] as const) {
      const o = await createOrder({ customer: c.id, pickupAt: at }, [])
      await deliverOrder(o.order.id)
    }

    renderPage(`/archive?customer=${ana.id}&from=2026-12-01&to=2026-12-20`)
    await waitFor(() => expect(orderLinks()).toHaveLength(1))
    expect(screen.getByTestId('customer-chip').textContent).toContain('Ana Pérez')
    expect((screen.getByLabelText('Des de') as HTMLInputElement).value).toBe('2026-12-01')

    fireEvent.click(screen.getByRole('button', { name: 'Treure el filtre de client' }))
    await waitFor(() => expect(orderLinks()).toHaveLength(2))
    expect(screen.queryByTestId('customer-chip')).toBeNull()
    // The date range stays.
    expect((screen.getByLabelText('Des de') as HTMLInputElement).value).toBe('2026-12-01')
  })

  it('reads the text filter from q', async () => {
    const ana = await getOrCreateCustomerByName('Ana Pérez')
    const joan = await getOrCreateCustomerByName('Joan Puig')
    for (const c of [ana, joan]) {
      const o = await createOrder({ customer: c.id, pickupAt: '2026-12-17T09:30:00.000Z' }, [])
      await deliverOrder(o.order.id)
    }
    renderPage('/archive?q=joan')
    await waitFor(() => expect(orderLinks()).toHaveLength(1))
  })
})
