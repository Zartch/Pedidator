import 'fake-indexeddb/auto'
import '@/i18n'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { closeSession, requireSession, startSession } from '@/data/session'
import { getOrCreateCustomerByName } from '@/data/repo/customers'
import { getOrderItems } from '@/data/repo/orderItems'
import { createOrder, deliverOrder, getOrder } from '@/data/repo/orders'
import { addDays, madridDateTimeToUtcIso, todayMadrid } from '@/lib/dates'
import DayPage from './DayPage'

let seq = 0

beforeEach(async () => {
  try {
    window.localStorage.clear()
  } catch {
    // ignore
  }
  await startSession({
    companyId: `daypage-${++seq}-${Date.now()}`,
    userId: 'u1',
    syncEnabled: false,
  })
})

afterEach(() => {
  cleanup()
  closeSession()
})

function renderDay() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route index element={<DayPage />} />
        <Route path="day/:date" element={<DayPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function dialogButton(name: string) {
  const dialog = await screen.findByRole('dialog')
  return within(dialog).getByRole('button', { name })
}

async function seedOrder(
  name: string,
  day: string,
  time: string,
  items: { name: string; prepDayBefore?: boolean; done?: boolean }[],
) {
  const customer = await getOrCreateCustomerByName(name)
  return createOrder(
    { customer: customer.id, pickupAt: madridDateTimeToUtcIso(day, time) },
    items.map((i) => ({ ...i, measure: 'unit' as const, quantity: 2 })),
  )
}

// The next pickup is also summarised in a block that only shows from 1024px, so a
// customer name can appear twice: the card is the one inside an <article>.
const card = (customer: string) =>
  screen
    .getAllByRole('link', { name: customer })
    .map((link) => link.closest('article'))
    .find((el): el is HTMLElement => el !== null) as HTMLElement

describe('DayPage', () => {
  it('ticking the last item prepares the order and raises the progress; unticking reverts it', async () => {
    const today = todayMadrid()
    await seedOrder('Marta', today, '10:00', [
      { name: 'Pollastre' },
      { name: 'Botifarra' },
    ])
    await seedOrder('Jordi', today, '11:00', [{ name: 'Costelles' }])
    renderDay()

    expect(await screen.findByText('0 de 2 encàrrecs preparats')).toBeDefined()
    const marta = card('Marta')
    fireEvent.click(within(marta).getByRole('checkbox', { name: /Pollastre/ }))
    await waitFor(() =>
      expect(
        within(card('Marta')).getByText('Per preparar · 1/2'),
      ).toBeDefined(),
    )
    expect(screen.getByText('0 de 2 encàrrecs preparats')).toBeDefined()

    fireEvent.click(
      within(card('Marta')).getByRole('checkbox', { name: /Botifarra/ }),
    )
    await waitFor(() =>
      expect(within(card('Marta')).getByText('Preparat')).toBeDefined(),
    )
    expect(screen.getByText('1 de 2 encàrrecs preparats')).toBeDefined()

    fireEvent.click(
      within(card('Marta')).getByRole('checkbox', { name: /Botifarra/ }),
    )
    await waitFor(() =>
      expect(within(card('Marta')).queryByText('Preparat')).toBeNull(),
    )
    expect(screen.getByText('0 de 2 encàrrecs preparats')).toBeDefined()
  })

  it("shows tomorrow's prepare-ahead item today and ticking it ticks it in its order", async () => {
    const today = todayMadrid()
    const tomorrow = addDays(today, 1)
    const { order } = await seedOrder('Anna', tomorrow, '09:30', [
      { name: 'Pernil', prepDayBefore: true },
      { name: 'Pa' },
    ])
    renderDay()

    const section = await screen.findByRole('region', {
      name: 'Preparar avui per a demà',
    })
    expect(within(section).getByText('09:30 · Anna')).toBeDefined()
    expect(within(section).queryByText('Pa')).toBeNull()
    fireEvent.click(within(section).getByRole('checkbox', { name: /Pernil/ }))

    await waitFor(async () => {
      const items = await getOrderItems(order.id)
      expect(items.find((i) => i.name === 'Pernil')?.done).toBe(true)
      expect(items.find((i) => i.name === 'Pa')?.done).toBe(false)
    })
    await waitFor(() => expect(within(section).getByText('1/1')).toBeDefined())
  })

  it('the prepare-ahead section is absent when there is nothing to prepare', async () => {
    await seedOrder('Anna', todayMadrid(), '09:30', [{ name: 'Pa' }])
    renderDay()
    await screen.findAllByText('Anna')
    expect(
      screen.queryByRole('region', { name: 'Preparar avui per a demà' }),
    ).toBeNull()
  })

  it('delivering a prepared order folds it into "Lliurats" and it still counts', async () => {
    const today = todayMadrid()
    await seedOrder('Marta', today, '10:00', [
      { name: 'Pollastre', done: true },
    ])
    await seedOrder('Jordi', today, '11:00', [{ name: 'Costelles' }])
    renderDay()

    expect(await screen.findByText('1 de 2 encàrrecs preparats')).toBeDefined()
    fireEvent.click(
      within(card('Marta')).getByRole('button', { name: 'Lliurar' }),
    )
    fireEvent.click(await dialogButton('Lliurar'))

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Lliurats (1)' }),
      ).toBeDefined(),
    )
    // Folded: the delivered order is no longer a card with items, and the group is collapsed.
    expect(screen.queryByRole('checkbox', { name: /Pollastre/ })).toBeNull()
    expect(
      screen
        .getByRole('button', { name: 'Lliurats (1)' })
        .getAttribute('aria-expanded'),
    ).toBe('false')
    expect(screen.getByText('1 de 2 encàrrecs preparats')).toBeDefined()
    expect(screen.getByText('1 lliurat')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Lliurats (1)' }))
    expect(screen.getByText('Lliurat')).toBeDefined()
  })

  it('"Torna a pendent" brings a delivered order back with its items as they were', async () => {
    const today = todayMadrid()
    await seedOrder('Marta', today, '10:00', [
      { name: 'Pollastre', done: true },
      { name: 'Botifarra' },
    ])
    renderDay()
    await screen.findAllByText('Marta')
    fireEvent.click(within(card('Marta')).getByRole('button', { name: 'Lliurar' }))
    fireEvent.click(await dialogButton('Lliurar'))
    const group = await screen.findByRole('button', { name: 'Lliurats (1)' })
    fireEvent.click(group)
    fireEvent.click(screen.getByRole('button', { name: 'Torna a pendent' }))

    await waitFor(() =>
      expect(within(card('Marta')).getByText('Per preparar · 1/2')).toBeDefined(),
    )
    expect(screen.queryByRole('button', { name: 'Lliurats (1)' })).toBeNull()
    const pollastre = within(card('Marta')).getByRole('checkbox', { name: /Pollastre/ })
    expect(pollastre.getAttribute('aria-checked')).toBe('true')
    const botifarra = within(card('Marta')).getByRole('checkbox', { name: /Botifarra/ })
    expect(botifarra.getAttribute('aria-checked')).toBe('false')
  })

  it('asks for confirmation before delivering an order that is not fully prepared', async () => {
    const today = todayMadrid()
    const { order } = await seedOrder('Jordi', today, '11:00', [
      { name: 'Costelles' },
    ])
    renderDay()
    await screen.findAllByText('Jordi')

    fireEvent.click(
      within(card('Jordi')).getByRole('button', { name: 'Lliurar' }),
    )
    const dialog = await screen.findByText(/encara no està preparat del tot/)
    expect(dialog).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Lliurats (1)' })).toBeNull()

    fireEvent.click(await dialogButton('Lliurar'))
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Lliurats (1)' }),
      ).toBeDefined(),
    )
    expect(order.id).toBeTruthy()
  })

  it('"Lliurar" always asks, and "Tornar" changes nothing', async () => {
    const today = todayMadrid()
    const { order } = await seedOrder('Marta', today, '10:00', [
      { name: 'Pollastre', done: true },
    ])
    renderDay()
    await screen.findAllByText('Marta')
    fireEvent.click(within(card('Marta')).getByRole('button', { name: 'Lliurar' }))
    expect(await screen.findByRole('dialog')).toBeDefined()
    fireEvent.click(await dialogButton('Tornar'))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect((await getOrder(order.id))?.status).toBe('pending')
    expect(await requireSession().db.tickets.count()).toBe(0)
  })

  it('"Lliurar i deixar a deure" delivers and creates the pending ticket', async () => {
    const today = todayMadrid()
    const { order } = await seedOrder('Marta', today, '10:00', [
      { name: 'Pollastre', done: true },
    ])
    renderDay()
    await screen.findAllByText('Marta')
    fireEvent.click(within(card('Marta')).getByRole('button', { name: 'Lliurar' }))
    fireEvent.click(await dialogButton('Lliurar i deixar a deure'))
    const dialog = screen.getByRole('dialog')
    expect((within(dialog).getByLabelText('Notes') as HTMLTextAreaElement).value).toMatch(
      /^Encàrrec del \d\d\/\d\d 10:00$/,
    )
    // Empty amount: nothing happens and it says so.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lliurar i crear ticket' }))
    expect(await within(dialog).findByText('Indica un import vàlid')).toBeDefined()
    expect((await getOrder(order.id))?.status).toBe('pending')

    fireEvent.change(within(dialog).getByLabelText('Import'), { target: { value: '12,50' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lliurar i crear ticket' }))
    await waitFor(async () =>
      expect((await getOrder(order.id))?.status).toBe('delivered'),
    )
    const tickets = await requireSession().db.tickets.toArray()
    expect(tickets).toHaveLength(1)
    expect(tickets[0]).toMatchObject({
      customer: (await getOrder(order.id))?.customer,
      amountCents: 1250,
      paid: false,
    })
    expect(tickets[0]?.notes).toMatch(/^Encàrrec del/)
  })

  it('an order with prices pre-fills the amount', async () => {
    const today = todayMadrid()
    const customer = await getOrCreateCustomerByName('Marta')
    await createOrder(
      { customer: customer.id, pickupAt: madridDateTimeToUtcIso(today, '10:00') },
      [{ name: 'Pollastre', measure: 'unit', quantity: 2, unitPriceCents: 450 }],
    )
    renderDay()
    await screen.findAllByText('Marta')
    fireEvent.click(within(card('Marta')).getByRole('button', { name: 'Lliurar' }))
    fireEvent.click(await dialogButton('Lliurar i deixar a deure'))
    expect(
      (within(screen.getByRole('dialog')).getByLabelText('Import') as HTMLInputElement).value,
    ).toBe('9,00')
  })

  it('flags an item that should have been prepared yesterday', async () => {
    const today = todayMadrid()
    await seedOrder('Anna', today, '09:30', [
      { name: 'Pernil', prepDayBefore: true },
    ])
    renderDay()
    expect(await screen.findByText('Calia preparar-ho ahir')).toBeDefined()
  })

  describe('"Mostra els lliurats" switch', () => {
    const calendarDay = (day: number) =>
      screen
        .getAllByRole('button', { name: new RegExp(`\\b${day}\\b`) })
        .filter(
          (b) => b.hasAttribute('aria-pressed') && b.hasAttribute('aria-label'),
        )

    async function seedDeliveredOnly() {
      const target = addDays(todayMadrid(), 1)
      const { order } = await seedOrder('Marta', target, '10:00', [
        { name: 'Pollastre', done: true },
      ])
      await deliverOrder(order.id)
      return Number(target.slice(8))
    }

    it('a day with only a delivered order has no mark when off, and has it when on', async () => {
      const n = await seedDeliveredOnly()
      renderDay()
      const sw = await screen.findByRole('switch', {
        name: 'Mostra els lliurats',
      })
      expect(sw.getAttribute('aria-checked')).toBe('false')
      await waitFor(() => expect(calendarDay(n).length).toBeGreaterThan(0))
      expect(
        calendarDay(n).every(
          (b) => !/amb encàrrecs/.test(b.getAttribute('aria-label') ?? ''),
        ),
      ).toBe(true)

      fireEvent.click(sw)
      await waitFor(() =>
        expect(
          calendarDay(n).some((b) =>
            /amb encàrrecs/.test(b.getAttribute('aria-label') ?? ''),
          ),
        ).toBe(true),
      )
    })

    it('is remembered on the device when the page is mounted again', async () => {
      renderDay()
      fireEvent.click(
        await screen.findByRole('switch', { name: 'Mostra els lliurats' }),
      )
      expect(window.localStorage.getItem('pedidator.showDelivered')).toBe('1')
      cleanup()
      renderDay()
      const sw = await screen.findByRole('switch', {
        name: 'Mostra els lliurats',
      })
      expect(sw.getAttribute('aria-checked')).toBe('true')
    })
  })
})

describe('DayPage phone calendar: week strip or whole month', () => {
  // The tablet month grid is always in the DOM (hidden by CSS on phones), so only look inside the phone slot.
  const phone = () =>
    document.getElementById('day-calendar-phone') as HTMLElement
  const weekGroup = () =>
    within(phone()).queryAllByRole('group', { name: /Setmana del/ })
  const monthGroup = () =>
    within(phone()).queryAllByRole('group', { name: /Calendari de/ })

  it('"Veure el mes" swaps the week for the month and "Veure la setmana" swaps back', async () => {
    renderDay()
    const toMonth = await screen.findByRole('button', { name: 'Veure el mes' })
    expect(toMonth.getAttribute('aria-expanded')).toBe('false')
    expect(weekGroup().length).toBeGreaterThan(0)
    expect(monthGroup().length).toBe(0)

    fireEvent.click(toMonth)
    const toWeek = await screen.findByRole('button', {
      name: 'Veure la setmana',
    })
    expect(toWeek.getAttribute('aria-expanded')).toBe('true')
    expect(monthGroup().length).toBeGreaterThan(0)
    expect(weekGroup().length).toBe(0)

    fireEvent.click(toWeek)
    await screen.findByRole('button', { name: 'Veure el mes' })
    expect(weekGroup().length).toBeGreaterThan(0)
    expect(monthGroup().length).toBe(0)
  })

  it('the month choice is remembered on the device when the page is mounted again', async () => {
    renderDay()
    fireEvent.click(await screen.findByRole('button', { name: 'Veure el mes' }))
    expect(window.localStorage.getItem('pedidator.calendarMonth')).toBe('1')
    cleanup()
    renderDay()
    const toWeek = await screen.findByRole('button', {
      name: 'Veure la setmana',
    })
    expect(toWeek.getAttribute('aria-expanded')).toBe('true')
  })

  it('picking a day from the month opens that day and keeps the month open', async () => {
    renderDay()
    fireEvent.click(await screen.findByRole('button', { name: 'Veure el mes' }))
    const dayButton = () =>
      within(monthGroup()[0] as HTMLElement)
        .getAllByRole('button')
        .find((b) => b.textContent === '15' && b.hasAttribute('aria-pressed'))
    // Day 15 is never a neighbouring-month day, so it is unique in the grid.
    expect(dayButton()).toBeDefined()
    fireEvent.click(dayButton() as HTMLElement)

    await waitFor(() =>
      expect(dayButton()?.getAttribute('aria-pressed')).toBe('true'),
    )
    expect(
      screen.getByRole('button', { name: 'Veure la setmana' }),
    ).toBeDefined()
  })
})
