import 'fake-indexeddb/auto'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { closeSession, requireSession, startSession } from '@/data/session'
import { getOrCreateCustomerByName } from '@/data/repo/customers'
import { createOrder } from '@/data/repo/orders'
import { getOrderItems } from '@/data/repo/orderItems'
import { madridDateTimeToUtcIso } from '@/lib/dates'
import OrderFormPage from './OrderFormPage'

let n = 0
beforeEach(async () => {
  window.localStorage.clear()
  await startSession({
    companyId: `ofp${n++}`,
    userId: 'u1',
    syncEnabled: false,
  })
})
afterEach(() => {
  cleanup()
  closeSession()
})

function Where() {
  return <output data-testid="where">{useLocation().pathname}</output>
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="orders/new" element={<OrderFormPage />} />
        <Route path="orders/:id" element={<OrderFormPage />} />
        <Route path="day/:date" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  )
}

const allOrders = () => requireSession().db.orders.toArray()
const allItems = () => requireSession().db.order_items.toArray()

async function fillCustomerAndItem(name: string, item: string) {
  fireEvent.change(await screen.findByLabelText('Client'), {
    target: { value: name },
  })
  fireEvent.change(screen.getByLabelText('Article'), {
    target: { value: item },
  })
}

const save = () => fireEvent.click(screen.getByRole('button', { name: 'Desa' }))

describe('OrderFormPage', () => {
  it('creates an order with a unit item and a weight item, then goes to its day', async () => {
    renderAt('/orders/new?date=2030-05-17')
    await fillCustomerAndItem('Bar La Plaça', 'Butifarra')
    fireEvent.change(screen.getByLabelText('Quantitat'), {
      target: { value: '6' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Afegeix un altre article' }),
    )
    const names = screen.getAllByLabelText('Article')
    fireEvent.change(names[1], { target: { value: 'Entrecot' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Pes' })[1])
    fireEvent.change(
      screen.getByLabelText('Quantitat', {
        selector: 'input[id^=item-weight]',
      }),
      {
        target: { value: '1,5kg' },
      },
    )
    fireEvent.change(screen.getByLabelText('Hora'), {
      target: { value: '12:30' },
    })
    save()
    await waitFor(() =>
      expect(screen.getByTestId('where').textContent).toBe('/day/2030-05-17'),
    )
    const [order] = await allOrders()
    expect(order.pickupAt).toBe(madridDateTimeToUtcIso('2030-05-17', '12:30'))
    const items = (await getOrderItems(order.id)).map((i) => [
      i.name,
      i.measure,
      i.quantity,
      i.orderedGrams,
    ])
    expect(items).toEqual([
      ['Butifarra', 'unit', 6, null],
      ['Entrecot', 'weight', 1, 1500],
    ])
  })

  it('does not show a total when no item has a price', async () => {
    renderAt('/orders/new')
    await fillCustomerAndItem('Bar', 'Butifarra')
    expect(screen.queryByTestId('order-total')).toBeNull()
  })

  it('shows an estimated total with "≈" for a priced weight item without real weight', async () => {
    renderAt('/orders/new')
    await fillCustomerAndItem('Bar', 'Entrecot')
    fireEvent.click(screen.getByRole('button', { name: 'Pes' }))
    fireEvent.click(screen.getByRole('button', { name: 'kg' }))
    fireEvent.change(
      screen.getByLabelText('Quantitat', {
        selector: 'input[id^=item-weight]',
      }),
      {
        target: { value: '2' },
      },
    )
    fireEvent.click(screen.getByRole('button', { name: 'Preu (opcional)' }))
    fireEvent.change(screen.getByLabelText('Preu per quilo'), {
      target: { value: '10' },
    })
    const total = await screen.findByTestId('order-total')
    expect(total.textContent).toContain('≈ 20,00 €')
  })

  it('does not save without items', async () => {
    renderAt('/orders/new')
    fireEvent.change(await screen.findByLabelText('Client'), {
      target: { value: 'Bar' },
    })
    save()
    expect(
      await screen.findByText('Afegeix com a mínim un article'),
    ).toBeTruthy()
    expect(await allOrders()).toHaveLength(0)
  })

  it('does not save when Enter is pressed in a field', async () => {
    renderAt('/orders/new')
    await fillCustomerAndItem('Bar', 'Butifarra')
    const notNotPrevented = fireEvent.keyDown(
      screen.getByLabelText('Article'),
      { key: 'Enter' },
    )
    expect(notNotPrevented).toBe(false)
    expect(await allOrders()).toHaveLength(0)
  })

  it('keeps the ids of existing items when editing', async () => {
    const customer = await getOrCreateCustomerByName('Marta')
    const { order, items } = await createOrder(
      {
        customer: customer.id,
        pickupAt: madridDateTimeToUtcIso('2030-05-17', '10:00'),
      },
      [
        { name: 'Pollastre', measure: 'unit', quantity: 2 },
        { name: 'Costella', measure: 'weight', orderedGrams: 750 },
      ],
    )
    renderAt(`/orders/${order.id}`)
    const names = await screen.findAllByLabelText('Article')
    expect((names[0] as HTMLInputElement).value).toBe('Pollastre')
    fireEvent.change(names[1], { target: { value: 'Costella de porc' } })
    save()
    await waitFor(() =>
      expect(screen.getByTestId('where').textContent).toBe('/day/2030-05-17'),
    )
    const after = (await allItems()).filter((i) => !i.deleted)
    expect(after.map((i) => i.id).sort()).toEqual(items.map((i) => i.id).sort())
    expect(after.find((i) => i.id === items[1].id)?.name).toBe(
      'Costella de porc',
    )
    expect(after.find((i) => i.id === items[1].id)?.orderedGrams).toBe(750)
  })

  it('cancels an existing order after confirmation', async () => {
    const customer = await getOrCreateCustomerByName('Marta')
    const { order } = await createOrder(
      {
        customer: customer.id,
        pickupAt: madridDateTimeToUtcIso('2030-05-17', '10:00'),
      },
      [{ name: 'Pollastre', measure: 'unit' }],
    )
    renderAt(`/orders/${order.id}`)
    fireEvent.click(
      await screen.findByRole('button', { name: "Cancel·la l'encàrrec" }),
    )
    fireEvent.click(
      await screen.findByRole('button', {
        name: "Sí, cancel·la'l",
        hidden: true,
      }),
    )
    await waitFor(() =>
      expect(screen.getByTestId('where').textContent).toBe('/day/2030-05-17'),
    )
    expect((await allOrders())[0].status).toBe('cancelled')
  })
})
