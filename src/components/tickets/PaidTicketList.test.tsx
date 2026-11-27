import 'fake-indexeddb/auto'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { closeSession, startSession } from '@/data/session'
import { getOrCreateCustomerByName } from '@/data/repo/customers'
import { createTicket, markTicketPaid } from '@/data/repo/tickets'
import { PaidTicketList } from './PaidTicketList'

let n = 0
beforeEach(async () => {
  await startSession({ companyId: `ptl${n++}`, userId: 'u1', syncEnabled: false })
})
afterEach(async () => {
  cleanup()
  await closeSession()
})

const renderList = (url = '/tickets?view=paid') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <PaidTicketList />
    </MemoryRouter>,
  )

async function paid(customer: string, amountCents: number) {
  const c = await getOrCreateCustomerByName(customer)
  const t = await createTicket({ customer: c.id, amountCents })
  await markTicketPaid(t.id)
  return t
}

describe('PaidTicketList', () => {
  it('shows the centered message when nothing is paid', async () => {
    renderList()
    expect(await screen.findByText('No hi ha tickets pagats')).toBeTruthy()
  })

  it('shows the total of the tickets that are listed', async () => {
    await paid('Bar La Plaça', 8240)
    await paid('Jordi Ferrer', 3800)
    renderList()
    await screen.findByRole('heading', { name: 'Bar La Plaça' })
    expect(screen.getByTestId('paid-total').textContent).toBe('120,40 €')
  })

  it('filters the total and the list by customer', async () => {
    await paid('Bar La Plaça', 8240)
    await paid('Jordi Ferrer', 3800)
    renderList()
    await screen.findByRole('heading', { name: 'Jordi Ferrer' })
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'jordi' } })
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Bar La Plaça' })).toBeNull(),
    )
    expect(screen.getByTestId('paid-total').textContent).toBe('38,00 €')
  })

  it('says so when a filter leaves nothing', async () => {
    await paid('Jordi Ferrer', 3800)
    renderList()
    await screen.findByRole('heading', { name: 'Jordi Ferrer' })
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } })
    expect(await screen.findByText('No hi ha tickets pagats amb aquest filtre.')).toBeTruthy()
  })

  it('returns a ticket to pending after confirmation', async () => {
    await paid('Jordi Ferrer', 3800)
    renderList()
    await screen.findByRole('heading', { name: 'Jordi Ferrer' })
    fireEvent.click(screen.getByRole('button', { name: 'Torna a pendent' }))
    const dialog = await screen.findByRole('dialog', { hidden: true })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Torna a pendent' }))
    await waitFor(() => expect(screen.getByText('No hi ha tickets pagats')).toBeTruthy())
  })

  it('keeps the ticket paid when the confirmation is cancelled', async () => {
    await paid('Jordi Ferrer', 3800)
    renderList()
    await screen.findByRole('heading', { name: 'Jordi Ferrer' })
    fireEvent.click(screen.getByRole('button', { name: 'Torna a pendent' }))
    const dialog = await screen.findByRole('dialog', { hidden: true })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel·la' }))
    expect(screen.getByRole('heading', { name: 'Jordi Ferrer' })).toBeTruthy()
  })

  it('filters by customer id and date range from the URL; the chip removes the customer', async () => {
    const ana = await getOrCreateCustomerByName('Ana Puig')
    const ta = await createTicket({ customer: ana.id, amountCents: 100 })
    await markTicketPaid(ta.id)
    await paid('Jordi Ferrer', 3800)
    renderList(`/tickets?view=paid&customer=${ana.id}&from=2000-01-01&to=2999-01-01`)
    await screen.findByRole('heading', { name: 'Ana Puig' })
    expect(screen.queryByRole('heading', { name: 'Jordi Ferrer' })).toBeNull()
    expect(screen.getByTestId('customer-chip').textContent).toContain('Ana Puig')
    expect(screen.getByTestId('paid-total').textContent).toBe('1,00 €')

    fireEvent.click(screen.getByRole('button', { name: 'Treure el filtre de client' }))
    await screen.findByRole('heading', { name: 'Jordi Ferrer' })
    expect(screen.queryByTestId('customer-chip')).toBeNull()
    expect(screen.getByTestId('paid-total').textContent).toBe('39,00 €')
  })

  it('a date range outside every payment leaves nothing', async () => {
    await paid('Jordi Ferrer', 3800)
    renderList('/tickets?view=paid&from=2000-01-01&to=2000-01-02')
    expect(await screen.findByText('No hi ha tickets pagats amb aquest filtre.')).toBeTruthy()
  })
})
