import 'fake-indexeddb/auto'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import CustomersPage from './CustomersPage'
import { getOrCreateCustomerByName } from '@/data/repo/customers'
import { closeSession, startSession } from '@/data/session'

let n = 0
beforeEach(async () => {
  await startSession({ companyId: `cp${n++}`, userId: 'u', syncEnabled: false })
  await getOrCreateCustomerByName('José García')
  await getOrCreateCustomerByName('Ana Martínez')
  await getOrCreateCustomerByName('Ángel Ruiz')
})
afterEach(() => {
  cleanup()
  closeSession()
})

function renderPage() {
  render(
    <MemoryRouter>
      <CustomersPage />
    </MemoryRouter>,
  )
  return screen.getByRole('searchbox') as HTMLInputElement
}

describe('CustomersPage search', () => {
  it('lists all customers by name before searching', async () => {
    renderPage()
    expect(await screen.findByText('José García')).toBeTruthy()
    expect(screen.getByText('Ana Martínez')).toBeTruthy()
    expect(screen.getByText('Ángel Ruiz')).toBeTruthy()
  })

  it('matches without accents and case', async () => {
    const search = renderPage()
    await screen.findByText('José García')

    fireEvent.change(search, { target: { value: 'jose' } })
    expect(screen.getByText('José García')).toBeTruthy()
    expect(screen.queryByText('Ana Martínez')).toBeNull()

    fireEvent.change(search, { target: { value: 'ANGEL' } })
    expect(screen.getByText('Ángel Ruiz')).toBeTruthy()
    expect(screen.queryByText('José García')).toBeNull()

    fireEvent.change(search, { target: { value: 'martinez' } })
    expect(screen.getByText('Ana Martínez')).toBeTruthy()
  })
})
