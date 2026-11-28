import 'fake-indexeddb/auto'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { createProduct, findProductByName } from '@/data/repo/products'
import { closeSession, startSession } from '@/data/session'
import ProductPage from './ProductPage'
import ProductsPage from './ProductsPage'

let n = 0
beforeEach(async () => {
  await startSession({ companyId: `pp${n++}`, userId: 'u', syncEnabled: false })
})
afterEach(() => {
  cleanup()
  closeSession()
})

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/new" element={<ProductPage />} />
        <Route path="products/:id" element={<ProductPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProductsPage', () => {
  it('shows a centred message when there are no products', async () => {
    renderAt('/products')
    expect(await screen.findByText('Encara no hi ha productes.')).toBeTruthy()
  })

  it('lists products without prices and filters by name ignoring accents', async () => {
    await createProduct({
      name: 'Fricandó',
      measure: 'weight',
      prepDayBefore: true,
      unitPriceCents: 1290,
    })
    await createProduct({ name: 'Pollastre', measure: 'unit', prepDayBefore: false })
    renderAt('/products')
    expect(await screen.findByText('Fricandó')).toBeTruthy()
    expect(screen.getByText('Pollastre')).toBeTruthy()
    expect(screen.getByText('Vigília')).toBeTruthy()
    expect(screen.queryByText(/12,90/)).toBeNull()

    fireEvent.change(screen.getByLabelText('Cerca de producte'), {
      target: { value: 'FRICANDO' },
    })
    expect(screen.queryByText('Pollastre')).toBeNull()
    expect(screen.getByText('Fricandó')).toBeTruthy()
  })
})

describe('ProductPage', () => {
  it('creates a product only with the button, not with Enter', async () => {
    renderAt('/products/new')
    const name = await screen.findByLabelText('Nom')
    fireEvent.change(name, { target: { value: 'Entrecot' } })
    fireEvent.keyDown(name, { key: 'Enter' })
    expect(await findProductByName('Entrecot')).toBeUndefined()

    fireEvent.click(screen.getByRole('button', { name: 'Desa' }))
    await waitFor(async () => {
      expect(await findProductByName('Entrecot')).toBeDefined()
    })
  })

  it('refuses a name already used by another product', async () => {
    await createProduct({ name: 'Entrecot', measure: 'unit', prepDayBefore: false })
    const other = await createProduct({ name: 'Pollastre', measure: 'unit', prepDayBefore: false })
    renderAt(`/products/${other.id}`)
    const name = (await screen.findByLabelText('Nom')) as HTMLInputElement
    fireEvent.change(name, { target: { value: 'entrecot' } })
    fireEvent.click(screen.getByRole('button', { name: 'Desa' }))
    expect(await screen.findByText('Ja existeix un producte amb aquest nom')).toBeTruthy()
    expect((await findProductByName('Pollastre'))?.id).toBe(other.id)
  })

  it('saves a price inside the closed Price section and deletes after confirming', async () => {
    const p = await createProduct({ name: 'Entrecot', measure: 'weight', prepDayBefore: false })
    renderAt(`/products/${p.id}`)
    fireEvent.click(await screen.findByRole('button', { name: /Preu/ }))
    fireEvent.change(screen.getByLabelText('Preu per quilo'), {
      target: { value: '24,90' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Desa' }))
    await waitFor(async () => {
      expect((await findProductByName('Entrecot'))?.unitPriceCents).toBe(2490)
    })
  })

  it('delete asks for confirmation first', async () => {
    const p = await createProduct({ name: 'Entrecot', measure: 'unit', prepDayBefore: false })
    renderAt(`/products/${p.id}`)
    fireEvent.click(await screen.findByRole('button', { name: 'Esborra el producte' }))
    expect(await findProductByName('Entrecot')).toBeDefined()
    fireEvent.click(await screen.findByRole('button', { name: 'Esborra' }))
    await waitFor(async () => {
      expect(await findProductByName('Entrecot')).toBeUndefined()
    })
  })
})
