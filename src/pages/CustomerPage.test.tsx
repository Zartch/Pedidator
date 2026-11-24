import 'fake-indexeddb/auto'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import CustomerPage from './CustomerPage'
import { getCustomer, getOrCreateCustomerByName } from '@/data/repo/customers'
import { closeSession, startSession } from '@/data/session'

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
