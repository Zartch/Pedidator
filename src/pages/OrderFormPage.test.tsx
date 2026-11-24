import 'fake-indexeddb/auto'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { closeSession, requireSession, startSession } from '@/data/session'
import { getOrCreateCustomerByName } from '@/data/repo/customers'
import { createOrder } from '@/data/repo/orders'
import { getOrderItems } from '@/data/repo/orderItems'
import { madridDateTimeToUtcIso, todayMadrid } from '@/lib/dates'
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

describe('OrderFormPage review fixes', () => {
  async function seed(name: string, itemName: string) {
    const customer = await getOrCreateCustomerByName(name)
    return createOrder(
      {
        customer: customer.id,
        pickupAt: madridDateTimeToUtcIso('2030-05-17', '10:00'),
      },
      [{ name: itemName, measure: 'unit' }],
    )
  }

  it('shows an error instead of silently doing nothing when the date or time is empty', async () => {
    renderAt('/orders/new?date=2030-05-17')
    await fillCustomerAndItem('Bar', 'Butifarra')
    fireEvent.change(screen.getByLabelText('Dia de recollida'), { target: { value: '' } })
    save()
    expect(await screen.findByText("Indica el dia i l'hora de recollida")).toBeTruthy()
    expect(await allOrders()).toHaveLength(0)
  })

  it('Discard with an empty date goes to today, not to /day/', async () => {
    renderAt('/orders/new?date=2030-05-17')
    fireEvent.change(await screen.findByLabelText('Dia de recollida'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel·la' }))
    await waitFor(() =>
      expect(screen.getByTestId('where').textContent).toBe(`/day/${todayMadrid()}`),
    )
  })

  it('shows "not found" right away for an unknown order', async () => {
    renderAt('/orders/nope')
    expect(await screen.findByText("No s'ha trobat l'encàrrec")).toBeTruthy()
  })

  it('an existing item left without a name is a validation error, not a silent delete', async () => {
    const { order, items } = await seed('Marta', 'Pollastre')
    renderAt(`/orders/${order.id}`)
    fireEvent.change((await screen.findAllByLabelText('Article'))[0], { target: { value: '' } })
    save()
    expect(await screen.findByText("L'article necessita un nom")).toBeTruthy()
    const stored = (await allItems()).find((i) => i.id === items[0].id)
    expect(stored?.deleted).toBe(false)
    expect(stored?.name).toBe('Pollastre')
  })

  it('a completely empty new row is still ignored', async () => {
    renderAt('/orders/new?date=2030-05-17')
    await fillCustomerAndItem('Bar', 'Butifarra')
    fireEvent.click(screen.getByRole('button', { name: 'Afegeix un altre article' }))
    save()
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/day/2030-05-17'))
    const [order] = await allOrders()
    expect(await getOrderItems(order.id)).toHaveLength(1)
  })

  it('moving from one order to another never shows or saves the first one’s data', async () => {
    const a = await seed('Ana', 'ItemA')
    const b = await seed('Berta', 'ItemB')
    function Nav() {
      const navigate = useNavigate()
      return (
        <button type="button" onClick={() => void navigate(`/orders/${b.order.id}`)}>
          goB
        </button>
      )
    }
    render(
      <MemoryRouter initialEntries={[`/orders/${a.order.id}`]}>
        <Nav />
        <Routes>
          <Route path="orders/:id" element={<OrderFormPage />} />
          <Route path="day/:date" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(((await screen.findAllByLabelText('Article'))[0] as HTMLInputElement).value).toBe('ItemA')
    fireEvent.click(screen.getByText('goB'))
    await waitFor(() =>
      expect(((screen.getAllByLabelText('Article')[0]) as HTMLInputElement).value).toBe('ItemB'),
    )
    expect((screen.getByLabelText('Client') as HTMLInputElement).value).toBe('Berta')
    save()
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/day/2030-05-17'))
    const items = await allItems()
    expect(items.find((i) => i.id === a.items[0].id)?.name).toBe('ItemA')
  })
})
