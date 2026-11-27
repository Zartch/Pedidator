/**
 * Read side of the UI. Each hook wraps a pure async query that takes the
 * database explicitly, so the queries can be tested without React.
 */
import { useSyncExternalStore } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { nameKey } from '@shared/nameKey'
import { madridDay, needsPrepAhead } from '@shared/progress'
import { madridDayRangeUtc } from '@/lib/dates'
import type {
  Customer,
  Measure,
  Order,
  OrderItem,
  Product,
  Ticket,
} from '@shared/types'
import type { PedidatorDb } from './db'
import { getSession, subscribeSession } from './session'

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
  unitPriceCents: number | null
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

/** One order with customer and items (null if missing or deleted). */
export async function queryOrderDetail(
  db: PedidatorDb,
  id: string,
): Promise<DayOrder | null> {
  const order = await db.orders.get(id)
  if (!order || order.deleted) return null
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
 * - hasOrders: any pending order; with `includeArchived`, also delivered ones
 *   (never cancelled).
 * - important: any pending order flagged important.
 * - prepAhead: any pending order with a `prepDayBefore` item (pickup-day mark).
 */
export async function queryMonthMarks(
  db: PedidatorDb,
  month: string,
  options: { includeArchived?: boolean } = {},
): Promise<Record<string, DayMarks>> {
  const first = `${month}-01`
  const [y, m] = month.split('-').map(Number)
  const lastDay = `${month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`
  const orders = (await ordersBetween(db, first, lastDay)).filter(
    (o) =>
      o.status === 'pending' ||
      (options.includeArchived === true && o.status === 'delivered'),
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
 * Item-name suggestions from the catalogue only (live products whose name
 * contains `text`); prefix matches first, then by name.
 */
export async function querySuggestItems(
  db: PedidatorDb,
  text: string,
  limit = 8,
): Promise<ItemSuggestion[]> {
  const key = nameKey(text)
  const all = await db.products
    .filter((p) => !p.deleted && p.nameKey.includes(key))
    .toArray()
  return all
    .sort((a, b) => {
      const pa = a.nameKey.startsWith(key) ? 0 : 1
      const pb = b.nameKey.startsWith(key) ? 0 : 1
      return pa - pb || a.nameKey.localeCompare(b.nameKey)
    })
    .slice(0, limit)
    .map((p) => ({
      name: p.name,
      measure: p.measure,
      prepDayBefore: p.prepDayBefore,
      unitPriceCents: p.unitPriceCents ?? null,
    }))
}

/** All live products by `nameKey`. */
export async function queryProducts(db: PedidatorDb): Promise<Product[]> {
  const all = await db.products.filter((p) => !p.deleted).toArray()
  return all.sort((a, b) => a.nameKey.localeCompare(b.nameKey))
}

/** One live product; null if missing or deleted. */
export async function queryProduct(
  db: PedidatorDb,
  id: string,
): Promise<Product | null> {
  const product = await db.products.get(id)
  return !product || product.deleted ? null : product
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

export type ArchiveFilter = {
  text?: string
  fromDay?: string
  toDay?: string
  /** Only orders of this customer id. */
  customerId?: string
}

/**
 * Delivered and cancelled orders (not deleted). `text` is matched as a substring
 * of the customer's nameKey; `fromDay`/`toDay` are inclusive Madrid days.
 * Newest pickup first.
 */
export async function queryArchivedOrders(
  db: PedidatorDb,
  filter: ArchiveFilter = {},
): Promise<DayOrder[]> {
  const { fromDay, toDay } = filter
  const key = nameKey(filter.text ?? '')
  const orders = (
    await db.orders.orderBy('pickupAt').reverse().toArray()
  ).filter((o) => {
    if (o.deleted || o.status === 'pending') return false
    if (filter.customerId && o.customer !== filter.customerId) return false
    if (fromDay || toDay) {
      const day = madridDay(o.pickupAt)
      if (fromDay && day < fromDay) return false
      if (toDay && day > toDay) return false
    }
    return true
  })
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
  return orders
    .map((order) => ({
      order,
      customer: customers.get(order.customer),
      items: items.get(order.id) ?? [],
    }))
    .filter((d) => !key || (d.customer?.nameKey ?? '').includes(key))
}

/** Number of delivered orders picked up in a Madrid month ("YYYY-MM"). */
export async function queryMonthDeliveredCount(
  db: PedidatorDb,
  month: string,
): Promise<number> {
  const [y, m] = month.split('-').map(Number)
  const last = `${month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`
  const orders = await ordersBetween(db, `${month}-01`, last)
  return orders.filter((o) => o.status === 'delivered').length
}

/** One live customer; null if missing, deleted or merged into another. */
export async function queryCustomer(
  db: PedidatorDb,
  id: string,
): Promise<Customer | null> {
  const customer = await db.customers.get(id)
  return !customer || customer.deleted || customer.mergedInto ? null : customer
}

/** Live tickets of a customer, paid and unpaid, newest first. */
export async function queryCustomerTickets(
  db: PedidatorDb,
  customerId: string,
): Promise<Ticket[]> {
  const tickets = await db.tickets
    .where('customer')
    .equals(customerId)
    .toArray()
  return tickets
    .filter((t) => !t.deleted)
    .sort((a, b) => b.created.localeCompare(a.created))
}

export type PaidTicketRow = {
  ticket: Ticket
  customer: Customer | null
}

export type PaidTicketFilter = {
  /** Only tickets of this customer id. */
  customerId?: string
  /** Substring of the customer's nameKey. */
  text?: string
  /** Inclusive Madrid days ("YYYY-MM-DD") matched against `paidAt`. */
  from?: string
  to?: string
}

/**
 * Paid, non-deleted tickets. `text` is matched against the customer's nameKey;
 * `from`/`to` are inclusive Madrid days of `paidAt` (a payment at 00:30 Madrid
 * counts on its own day). Newest payment first.
 */
export async function queryPaidTickets(
  db: PedidatorDb,
  filter: PaidTicketFilter = {},
): Promise<PaidTicketRow[]> {
  const key = nameKey(filter.text ?? '')
  const hasRange = Boolean(filter.from || filter.to)
  const fromMs = filter.from
    ? Date.parse(madridDayRangeUtc(filter.from).from)
    : Number.NEGATIVE_INFINITY
  const toMs = filter.to
    ? Date.parse(madridDayRangeUtc(filter.to).to)
    : Number.POSITIVE_INFINITY
  // Booleans are not valid IndexedDB keys, so `paid` is filtered, not queried.
  const tickets = (
    await db.tickets
      .filter(
        (t) =>
          t.paid && !t.deleted && (!filter.customerId || t.customer === filter.customerId),
      )
      .toArray()
  )
    .filter((t) => {
      if (!hasRange) return true
      if (!t.paidAt) return false
      const ms = Date.parse(t.paidAt)
      return ms >= fromMs && ms < toMs
    })
  const customers = await customersById(
    db,
    tickets.map((t) => t.customer),
  )
  return tickets
    .map((ticket) => ({
      ticket,
      customer: customers.get(ticket.customer) ?? null,
    }))
    .filter((row) => !key || (row.customer?.nameKey ?? '').includes(key))
    .sort(
      (a, b) =>
        (b.ticket.paidAt ?? '').localeCompare(a.ticket.paidAt ?? '') ||
        a.ticket.id.localeCompare(b.ticket.id),
    )
}

// ---- hooks -------------------------------------------------------------------

/** Current session (db + context); re-renders when it starts, changes company or closes. */
export function useSession() {
  return useSyncExternalStore(subscribeSession, getSession, getSession)
}

/** Runs `query` against the current session database; `undefined` while loading or with no session. */
function useDbQuery<T>(
  query: (db: PedidatorDb) => Promise<T>,
  deps: unknown[],
): T | undefined {
  const session = useSession()
  return useLiveQuery(
    () => (session ? query(session.db) : undefined),
    [session, ...deps],
  )
}

export const useDayOrders = (day: string) =>
  useDbQuery((db) => queryDayOrders(db, day), [day])

/** undefined = loading, null = not found. */
export const useOrderDetail = (id: string | undefined) =>
  useDbQuery(
    (db) => (id ? queryOrderDetail(db, id) : Promise.resolve(null)),
    [id],
  )

export const usePrepAheadItems = (todayMadrid: string) =>
  useDbQuery((db) => queryPrepAheadItems(db, todayMadrid), [todayMadrid])

export const useMonthMarks = (
  month: string,
  options?: { includeArchived?: boolean },
) =>
  useDbQuery(
    (db) => queryMonthMarks(db, month, options),
    [month, options?.includeArchived ?? false],
  )

export const usePendingTickets = () => useDbQuery(queryPendingTickets, [])

export const useCustomerSuggestions = (text: string, limit = 8) =>
  useDbQuery((db) => querySuggestCustomers(db, text, limit), [text, limit])

export const useItemSuggestions = (text: string, limit = 8) =>
  useDbQuery((db) => querySuggestItems(db, text, limit), [text, limit])

export const useProducts = () => useDbQuery(queryProducts, [])

/** undefined = loading, null = not found. */
export const useProduct = (id: string | undefined) =>
  useDbQuery(
    (db) => (id ? queryProduct(db, id) : Promise.resolve(null)),
    [id],
  )

export const useCustomers = () => useDbQuery(queryCustomers, [])

export const useCustomerOrders = (customerId: string) =>
  useDbQuery((db) => queryCustomerOrders(db, customerId), [customerId])

export const useArchivedOrders = (filter: ArchiveFilter) =>
  useDbQuery(
    (db) => queryArchivedOrders(db, filter),
    [filter.text, filter.fromDay, filter.toDay, filter.customerId],
  )

export const useMonthDeliveredCount = (month: string) =>
  useDbQuery((db) => queryMonthDeliveredCount(db, month), [month])

/** undefined = loading, null = not found. */
export const useCustomer = (id: string | undefined) =>
  useDbQuery(
    (db) => (id ? queryCustomer(db, id) : Promise.resolve(null)),
    [id],
  )

export const useCustomerTickets = (customerId: string) =>
  useDbQuery((db) => queryCustomerTickets(db, customerId), [customerId])

export const usePaidTickets = (filter: PaidTicketFilter) =>
  useDbQuery(
    (db) => queryPaidTickets(db, filter),
    [filter.text, filter.from, filter.to, filter.customerId],
  )
