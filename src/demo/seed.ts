import { createTicket, deleteTicket, markTicketPaid } from '@/data/repo/tickets'
import { getOrCreateCustomerByName } from '@/data/repo/customers'
import type { ItemInput } from '@/data/repo/orderItems'
import {
  createProduct,
  deleteProduct,
  findProductByName,
} from '@/data/repo/products'
import { createOrder, deleteOrder, deliverOrder } from '@/data/repo/orders'
import {
  queryCustomerOrders,
  queryCustomerTickets,
  queryCustomers,
  queryProducts,
} from '@/data/hooks'
import { requireSession } from '@/data/session'
import { addDays, madridDateTimeToUtcIso, monthBounds, monthOf, todayMadrid } from '@/lib/dates'

// Demo data only (Dexie through the repositories). Names and products are sample
// data for a butcher's shop, not interface text, so they are not translated.

type OrderPlan = {
  customer: string
  /** Days from today (Madrid). */
  offset: number
  time: string
  important?: boolean
  notes?: string
  /** Delivered orders get all their items done. */
  delivered?: boolean
  items: ItemInput[]
}

const ORDERS: OrderPlan[] = [
  // Today
  {
    customer: 'Maria Puig',
    offset: 0,
    time: '09:00',
    notes: 'Sense greix',
    items: [
      { name: 'Pollastre de corral', measure: 'unit', quantity: 2 },
      { name: 'Costella de porc', measure: 'weight', orderedGrams: 1500 },
    ],
  },
  {
    customer: 'Joan Serra',
    offset: 0,
    time: '10:30',
    important: true,
    items: [
      { name: 'Llonganissa', measure: 'weight', orderedGrams: 600, weightGrams: 620, done: true },
      { name: 'Xoriço', measure: 'unit', quantity: 3 },
    ],
  },
  {
    customer: 'Restaurant Can Pep',
    offset: 0,
    time: '12:00',
    important: true,
    notes: 'Entrega a la cuina de darrere',
    items: [
      {
        name: 'Entrecot',
        measure: 'weight',
        orderedGrams: 2400,
        unitPriceCents: 2490,
      },
      { name: 'Vedella per guisar', measure: 'weight', orderedGrams: 1800 },
    ],
  },
  {
    customer: 'Pere Vila',
    offset: 0,
    time: '17:30',
    items: [
      { name: 'Pernil dessossat', measure: 'weight', orderedGrams: 900, weightGrams: 884, done: true },
      { name: 'Botifarra', measure: 'unit', quantity: 6 },
    ],
  },
  // Tomorrow, with items to prepare the day before
  {
    customer: 'Núria Ferrer',
    offset: 1,
    time: '09:30',
    items: [
      { name: 'Fricandó de vedella', measure: 'weight', orderedGrams: 1200, prepDayBefore: true },
      { name: 'Pollastre de corral', measure: 'unit', quantity: 1 },
    ],
  },
  {
    customer: 'Cal Tomàs',
    offset: 1,
    time: '11:00',
    important: true,
    items: [
      { name: 'Costelles adobades', measure: 'weight', orderedGrams: 1100, prepDayBefore: true },
      { name: 'Llom adobat', measure: 'weight', orderedGrams: 500 },
    ],
  },
  {
    customer: 'Anna Roca',
    offset: 1,
    time: '16:00',
    items: [{ name: 'Carn picada', measure: 'weight', orderedGrams: 350 }],
  },
  {
    customer: 'Bar La Plaça',
    offset: 1,
    time: '08:00',
    items: [
      { name: 'Hamburgueses', measure: 'unit', quantity: 20, prepDayBefore: true },
      { name: 'Salsitxes', measure: 'unit', quantity: 12 },
    ],
  },
  // Earlier this month: delivered
  {
    customer: 'Jordi Mas',
    offset: -1,
    time: '10:00',
    delivered: true,
    items: [
      { name: 'Pollastre de corral', measure: 'unit', quantity: 2, done: true },
      { name: 'Ànec', measure: 'weight', orderedGrams: 1300, weightGrams: 1320, done: true },
    ],
  },
  {
    customer: 'Carmen Soler',
    offset: -1,
    time: '18:00',
    delivered: true,
    notes: 'Deixar a la porta',
    items: [
      {
        name: 'Xai',
        measure: 'weight',
        orderedGrams: 1500,
        weightGrams: 1490,
        unitPriceCents: 1890,
        done: true,
      },
    ],
  },
  {
    customer: 'Maria Puig',
    offset: -4,
    time: '09:15',
    delivered: true,
    items: [{ name: 'Bistec de vedella', measure: 'weight', orderedGrams: 700, done: true }],
  },
  {
    customer: 'Joan Serra',
    offset: -9,
    time: '10:00',
    delivered: true,
    items: [{ name: 'Pernil dessossat', measure: 'weight', orderedGrams: 1200, done: true }],
  },
  // Later this month
  {
    customer: 'Jordi Mas',
    offset: 3,
    time: '10:00',
    items: [{ name: 'Costella de porc', measure: 'weight', orderedGrams: 1000 }],
  },
  {
    customer: 'Carmen Soler',
    offset: 5,
    time: '12:30',
    important: true,
    items: [{ name: 'Pollastre de corral', measure: 'unit', quantity: 4 }],
  },
]

type ProductPlan = {
  name: string
  measure: 'unit' | 'weight'
  prepDayBefore?: boolean
  unitPriceCents?: number
}

// The catalogue of the demo: every name the orders use; some carry a price.
const PRODUCTS: ProductPlan[] = [
  { name: 'Pollastre de corral', measure: 'unit', unitPriceCents: 790 },
  { name: 'Costella de porc', measure: 'weight', unitPriceCents: 1050 },
  { name: 'Llonganissa', measure: 'weight' },
  { name: 'Xoriço', measure: 'unit' },
  { name: 'Entrecot', measure: 'weight', unitPriceCents: 2490 },
  { name: 'Vedella per guisar', measure: 'weight', unitPriceCents: 1390 },
  { name: 'Pernil dessossat', measure: 'weight' },
  { name: 'Botifarra', measure: 'unit' },
  { name: 'Fricandó de vedella', measure: 'weight', prepDayBefore: true },
  { name: 'Costelles adobades', measure: 'weight', prepDayBefore: true },
  { name: 'Llom adobat', measure: 'weight' },
  { name: 'Carn picada', measure: 'weight', unitPriceCents: 990 },
  { name: 'Hamburgueses', measure: 'unit', prepDayBefore: true },
  { name: 'Salsitxes', measure: 'unit' },
  { name: 'Ànec', measure: 'weight' },
  { name: 'Xai', measure: 'weight', unitPriceCents: 1890 },
  { name: 'Bistec de vedella', measure: 'weight' },
]

type TicketPlan = { customer: string; amountCents: number; notes?: string; paid?: boolean }

const TICKETS: TicketPlan[] = [
  { customer: 'Maria Puig', amountCents: 1850 },
  { customer: 'Pere Vila', amountCents: 3240, notes: 'Setmana passada' },
  { customer: 'Bar La Plaça', amountCents: 4500, notes: 'Factura de la setmana' },
  { customer: 'Jordi Mas', amountCents: 990, paid: true },
]

/**
 * Loads the sample data. Customers are found by name, so loading twice does not
 * duplicate them. Orders and tickets are added again on each load.
 * Today and tomorrow always get orders; the other days are kept inside the current month.
 */
export async function loadDemoData(now: Date = new Date()): Promise<void> {
  const today = todayMadrid(now)
  const { first, last } = monthBounds(monthOf(today))
  for (const product of PRODUCTS) {
    if (await findProductByName(product.name)) continue
    await createProduct({
      name: product.name,
      measure: product.measure,
      prepDayBefore: product.prepDayBefore ?? false,
      unitPriceCents: product.unitPriceCents,
    })
  }
  for (const plan of ORDERS) {
    const day = addDays(today, plan.offset)
    const isTodayOrTomorrow = plan.offset === 0 || plan.offset === 1
    if (!isTodayOrTomorrow && (day < first || day > last)) continue
    const customer = await getOrCreateCustomerByName(plan.customer)
    const { order } = await createOrder(
      {
        customer: customer.id,
        pickupAt: madridDateTimeToUtcIso(day, plan.time),
        important: plan.important,
        notes: plan.notes,
      },
      plan.items,
    )
    if (plan.delivered) await deliverOrder(order.id)
  }
  for (const plan of TICKETS) {
    const customer = await getOrCreateCustomerByName(plan.customer)
    const ticket = await createTicket({
      customer: customer.id,
      amountCents: plan.amountCents,
      notes: plan.notes,
    })
    if (plan.paid) await markTicketPaid(ticket.id)
  }
}

/**
 * Logically deletes every order, ticket and product of the demo. Customers stay:
 * the data layer has no customer delete yet.
 */
export async function clearDemoData(): Promise<void> {
  const { db } = requireSession()
  for (const customer of await queryCustomers(db)) {
    for (const order of await queryCustomerOrders(db, customer.id)) {
      await deleteOrder(order.id)
    }
    for (const ticket of await queryCustomerTickets(db, customer.id)) {
      await deleteTicket(ticket.id)
    }
  }
  for (const product of await queryProducts(db)) {
    await deleteProduct(product.id)
  }
}
