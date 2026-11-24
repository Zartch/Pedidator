/**
 * Read side of the UI. Each hook wraps a pure async query that takes the
 * database explicitly, so the queries can be tested without React.
 */
import { useLiveQuery } from 'dexie-react-hooks'
import { nameKey } from '@shared/nameKey'
import { madridDay, needsPrepAhead } from '@shared/progress'
import type { Customer, Measure, Order, OrderItem, Ticket } from '@shared/types'
import type { PedidatorDb } from './db'
import { getSession } from './session'

export type DayOrder = {
  order: Order
  customer: Customer | undefined
  /** Non-deleted items sorted by `position`. */
  items: OrderItem[]
}

export type PrepAheadItem = {
  item: OrderItem
  order: Order
  customer: Customer | undefined
}

export type DayMarks = {
  hasOrders: boolean
  important: boolean
  prepAhead: boolean
}

export type TicketGroup = {
  customer: Customer | null
  tickets: Ticket[]
  totalCents: number
}

export type ItemSuggestion = {
  name: string
  measure: Measure
  prepDayBefore: boolean
  lastUsed: string
}

// ---- date helpers (private) -------------------------------------------------

/** "YYYY-MM-DD" shifted by `days` calendar days. */
function shiftDay(day: string, days: number): string {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

/**
 * Superset UTC range [from, to] of ISO instants for the Madrid days
 * firstDay..lastDay (one day of margin each side); callers refine with madridDay.
 */
function utcRange(firstDay: string, lastDay: string): [string, string] {
  return [
    `${shiftDay(firstDay, -1)}T00:00:00.000Z`,
    `${shiftDay(lastDay, 1)}T23:59:59.999Z`,
  ]
}

async function ordersBetween(
  db: PedidatorDb,
  firstDay: string,
  lastDay: string,
) {
  const [from, to] = utcRange(firstDay, lastDay)
  const orders = await db.orders
    .where('pickupAt')
    .between(from, to, true, true)
    .toArray()
  return orders
    .filter((o) => {
      if (o.deleted) return false
      const day = madridDay(o.pickupAt)
      return day >= firstDay && day <= lastDay
    })
    .sort(
      (a, b) =>
        a.pickupAt.localeCompare(b.pickupAt) || a.id.localeCompare(b.id),
    )
}

async function itemsByOrder(db: PedidatorDb, orderIds: string[]) {
  const items = await db.order_items.where('order').anyOf(orderIds).toArray()
  const map = new Map<string, OrderItem[]>()
  for (const item of items) {
    if (item.deleted) continue
    const list = map.get(item.order)
    if (list) list.push(item)
    else map.set(item.order, [item])
  }
  for (const list of map.values()) list.sort((a, b) => a.position - b.position)
  return map
}

async function customersById(db: PedidatorDb, ids: string[]) {
  const rows = await db.customers.bulkGet([...new Set(ids)])
  return new Map(rows.flatMap((c) => (c ? [[c.id, c] as const] : [])))
}

// ---- pure queries ------------------------------------------------------------

/** Orders (all statuses, not deleted) picked up on a Madrid day, by time, with customer and items. */
export async function queryDayOrders(
  db: PedidatorDb,
  day: string,
): Promise<DayOrder[]> {
  const orders = await ordersBetween(db, day, day)
  const [items, customers] = await Promise.all([
    itemsByOrder(
      db,
      orders.map((o) => o.id),
    ),
    customersById(
      db,
      orders.map((o) => o.customer),
    ),
  ])
  return orders.map((order) => ({
    order,
    customer: customers.get(order.customer),
    items: items.get(order.id) ?? [],
  }))
}

/** One order with customer and items (undefined if missing or deleted). */
export async function queryOrderDetail(
  db: PedidatorDb,
  id: string,
): Promise<DayOrder | undefined> {
  const order = await db.orders.get(id)
  if (!order || order.deleted) return undefined
  const [items, customers] = await Promise.all([
    itemsByOrder(db, [id]),
    customersById(db, [order.customer]),
  ])
  return {
    order,
    customer: customers.get(order.customer),
    items: items.get(id) ?? [],
  }
}

/**
 * "Prepare today for tomorrow": `prepDayBefore` items (done or not) of the
 * pending orders picked up the day after `todayMadrid`, by pickup time then position.
 */
export async function queryPrepAheadItems(
  db: PedidatorDb,
  todayMadrid: string,
): Promise<PrepAheadItem[]> {
  const tomorrow = shiftDay(todayMadrid, 1)
  const orders = (await ordersBetween(db, tomorrow, tomorrow)).filter(
    (o) => o.status === 'pending',
  )
  const [items, customers] = await Promise.all([
    itemsByOrder(
      db,
      orders.map((o) => o.id),
    ),
    customersById(
      db,
      orders.map((o) => o.customer),
    ),
  ])
  return orders.flatMap((order) =>
    (items.get(order.id) ?? [])
      .filter((item) => item.prepDayBefore)
      .map((item) => ({
        item,
        order,
        customer: customers.get(order.customer),
      })),
  )
}

/**
 * Marks for each day of `month` ("YYYY-MM") that has any pickup. Days without
 * orders are absent.
 * - hasOrders: any non-cancelled order.
 * - important: any pending order flagged important.
 * - prepAhead: any pending order with a `prepDayBefore` item (pickup-day mark).
 */
export async function queryMonthMarks(
  db: PedidatorDb,
  month: string,
): Promise<Record<string, DayMarks>> {
  const first = `${month}-01`
  const [y, m] = month.split('-').map(Number)
  const lastDay = `${month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`
  const orders = (await ordersBetween(db, first, lastDay)).filter(
    (o) => o.status !== 'cancelled',
  )
  const items = await itemsByOrder(
    db,
    orders.map((o) => o.id),
  )
  const marks: Record<string, DayMarks> = {}
  for (const o of orders) {
    const day = madridDay(o.pickupAt)
    const m = (marks[day] ??= {
      hasOrders: false,
      important: false,
      prepAhead: false,
    })
    m.hasOrders = true
    if (o.status === 'pending') {
      if (o.important) m.important = true
      if (needsPrepAhead(items.get(o.id) ?? [])) m.prepAhead = true
    }
  }
  return marks
}

/** Unpaid, non-deleted tickets grouped by customer (name order), newest ticket first. */
export async function queryPendingTickets(
  db: PedidatorDb,
): Promise<TicketGroup[]> {
  // Booleans are not valid IndexedDB keys, so `paid` is filtered, not queried.
  const tickets = await db.tickets
    .filter((t) => !t.paid && !t.deleted)
    .toArray()
  const customers = await customersById(
    db,
    tickets.map((t) => t.customer),
  )
  const groups = new Map<string, TicketGroup>()
  for (const t of tickets) {
    let g = groups.get(t.customer)
    if (!g) {
      g = {
        customer: customers.get(t.customer) ?? null,
        tickets: [],
        totalCents: 0,
      }
      groups.set(t.customer, g)
    }
    g.tickets.push(t)
    g.totalCents += t.amountCents
  }
  const list = [...groups.values()]
  for (const g of list)
    g.tickets.sort((a, b) => b.created.localeCompare(a.created))
  return list.sort((a, b) =>
    (a.customer?.nameKey ?? '').localeCompare(b.customer?.nameKey ?? ''),
  )
}

/** Live customers whose name contains `text`; prefix matches first. Empty text lists all. */
export async function querySuggestCustomers(
  db: PedidatorDb,
  text: string,
  limit = 8,
): Promise<Customer[]> {
  const key = nameKey(text)
  const all = await db.customers
    .filter((c) => !c.deleted && !c.mergedInto)
    .toArray()
  return all
    .filter((c) => c.nameKey.includes(key))
    .sort((a, b) => {
      const pa = a.nameKey.startsWith(key) ? 0 : 1
      const pb = b.nameKey.startsWith(key) ? 0 : 1
      return pa - pb || a.nameKey.localeCompare(b.nameKey)
    })
    .slice(0, limit)
}

/**
 * Item-name suggestions, one per distinct name. The most recently created item
 * with that name supplies `measure`, `prepDayBefore` and `lastUsed`.
 */
export async function querySuggestItems(
  db: PedidatorDb,
  text: string,
  limit = 8,
): Promise<ItemSuggestion[]> {
  const key = nameKey(text)
  const latest = new Map<string, OrderItem>()
  await db.order_items
    .filter((i) => !i.deleted && nameKey(i.name).includes(key))
    .each((i) => {
      const k = nameKey(i.name)
      const prev = latest.get(k)
      if (!prev || i.created > prev.created) latest.set(k, i)
    })
  return [...latest.entries()]
    .sort(([ka, a], [kb, b]) => {
      const pa = ka.startsWith(key) ? 0 : 1
      const pb = kb.startsWith(key) ? 0 : 1
      return pa - pb || b.created.localeCompare(a.created)
    })
    .slice(0, limit)
    .map(([, i]) => ({
      name: i.name,
      measure: i.measure,
      prepDayBefore: i.prepDayBefore,
      lastUsed: i.created,
    }))
}

/** All live customers by name. */
export async function queryCustomers(db: PedidatorDb): Promise<Customer[]> {
  const all = await db.customers
    .filter((c) => !c.deleted && !c.mergedInto)
    .toArray()
  return all.sort((a, b) => a.nameKey.localeCompare(b.nameKey))
}

/** Live orders of a customer (any status), newest pickup first. */
export async function queryCustomerOrders(
  db: PedidatorDb,
  customerId: string,
): Promise<Order[]> {
  const orders = await db.orders.where('customer').equals(customerId).toArray()
  return orders
    .filter((o) => !o.deleted)
    .sort((a, b) => b.pickupAt.localeCompare(a.pickupAt))
}

// ---- hooks -------------------------------------------------------------------

/** Runs `query` against the current session database; `undefined` while loading or with no session. */
function useDbQuery<T>(
  query: (db: PedidatorDb) => Promise<T>,
  deps: unknown[],
): T | undefined {
  return useLiveQuery(() => {
    const s = getSession()
    return s ? query(s.db) : undefined
  }, deps)
}

export const useDayOrders = (day: string) =>
  useDbQuery((db) => queryDayOrders(db, day), [day])

export const useOrderDetail = (id: string | undefined) =>
  useDbQuery(
    (db) => (id ? queryOrderDetail(db, id) : Promise.resolve(undefined)),
    [id],
  )

export const usePrepAheadItems = (todayMadrid: string) =>
  useDbQuery((db) => queryPrepAheadItems(db, todayMadrid), [todayMadrid])

export const useMonthMarks = (month: string) =>
  useDbQuery((db) => queryMonthMarks(db, month), [month])

export const usePendingTickets = () => useDbQuery(queryPendingTickets, [])

export const useCustomerSuggestions = (text: string, limit = 8) =>
  useDbQuery((db) => querySuggestCustomers(db, text, limit), [text, limit])

export const useItemSuggestions = (text: string, limit = 8) =>
  useDbQuery((db) => querySuggestItems(db, text, limit), [text, limit])

export const useCustomers = () => useDbQuery(queryCustomers, [])

export const useCustomerOrders = (customerId: string) =>
  useDbQuery((db) => queryCustomerOrders(db, customerId), [customerId])
