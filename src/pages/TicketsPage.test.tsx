import 'fake-indexeddb/auto'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { closeSession, startSession } from '@/data/session'
import { getOrCreateCustomerByName } from '@/data/repo/customers'
import { createTicket, markTicketPaid } from '@/data/repo/tickets'
import TicketsPage from './TicketsPage'

let n = 0
beforeEach(async () => {
  await startSession({ companyId: `tkp${n++}`, userId: 'u1', syncEnabled: false })
})
afterEach(async () => {
  cleanup()
  await closeSession()
})

const renderPageAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <TicketsPage />
    </MemoryRouter>,
  )
const renderPage = () => renderPageAt('/tickets')

describe('TicketsPage', () => {
  it('shows the centered message when there are no tickets', async () => {
    renderPage()
    expect(await screen.findByText('No hi ha tickets pendents')).toBeTruthy()
  })

  it('groups by customer with per-customer and grand totals', async () => {
    const bar = await getOrCreateCustomerByName('Bar La Plaça')
    const jordi = await getOrCreateCustomerByName('Jordi Ferrer')
    await createTicket({ customer: bar.id, amountCents: 8240 })
    await createTicket({ customer: bar.id, amountCents: 4250 })
    await createTicket({ customer: jordi.id, amountCents: 3800 })
    renderPage()
    const barHeading = await screen.findByRole('heading', { name: 'Bar La Plaça' })
    expect(within(barHeading.parentElement!).getByText('124,90 €')).toBeTruthy()
    const jordiHeading = screen.getByRole('heading', { name: 'Jordi Ferrer' })
    expect(within(jordiHeading.parentElement!).getByText('38,00 €')).toBeTruthy()
    expect(screen.getByTestId('grand-total').textContent).toBe('162,90 €')
  })

  it('creates a ticket without photo, accepting a decimal comma', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Nou ticket' }))
    const dialog = await screen.findByRole('dialog', { hidden: true })
    fireEvent.change(within(dialog).getByLabelText('Client'), { target: { value: 'Núria Camps' } })
    fireEvent.change(within(dialog).getByLabelText('Import'), { target: { value: '23,5' } })
    fireEvent.change(within(dialog).getByLabelText('Notes'), { target: { value: 'pendent' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Desa' }))
    const heading = await screen.findByRole('heading', { name: 'Núria Camps' })
    expect(within(heading.parentElement!).getByText('23,50 €')).toBeTruthy()
    expect(screen.getByText(/ · pendent$/)).toBeTruthy()
  })

  it('does not save on Enter and validates the amount', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Nou ticket' }))
    const dialog = await screen.findByRole('dialog', { hidden: true })
    const customerInput = within(dialog).getByLabelText('Client')
    fireEvent.change(customerInput, { target: { value: 'Ana' } })
    fireEvent.keyDown(customerInput, { key: 'Enter' })
    expect(screen.queryByRole('heading', { name: 'Ana' })).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Desa' }))
    expect(within(dialog).getByText('Indica un import vàlid')).toBeTruthy()
  })

  it('marks a ticket as paid and removes it from the list', async () => {
    const c = await getOrCreateCustomerByName('Jordi Ferrer')
    await createTicket({ customer: c.id, amountCents: 3800 })
    renderPage()
    await screen.findByRole('heading', { name: 'Jordi Ferrer' })
    fireEvent.click(screen.getByRole('button', { name: /Marca com a pagat/ }))
    await waitFor(() => expect(screen.getByText('No hi ha tickets pendents')).toBeTruthy())
  })
})

describe('TicketsPage paid view', () => {
  it('switches tabs and keeps the view in the URL', async () => {
    const c = await getOrCreateCustomerByName('Laia Roca')
    const t = await createTicket({ customer: c.id, amountCents: 1000 })
    await markTicketPaid(t.id)
    renderPage()
    await screen.findByText('No hi ha tickets pendents')
    fireEvent.click(screen.getByRole('tab', { name: 'Pagats' }))
    expect(await screen.findByRole('heading', { name: 'Laia Roca' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Pagats', selected: true })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Nou ticket' })).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'Pendents' }))
    expect(await screen.findByText('No hi ha tickets pendents')).toBeTruthy()
  })

  it('opens on the paid view from ?view=paid', async () => {
    renderPageAt('/tickets?view=paid')
    expect(await screen.findByText('No hi ha tickets pagats')).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Pagats', selected: true })).toBeTruthy()
  })
})
