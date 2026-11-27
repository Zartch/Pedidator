export type Base = {
  id: string
  company: string
  version: number
  updatedBy: string
  deleted: boolean
  created: string
  updated: string
}

export type OrderStatus = 'pending' | 'delivered' | 'cancelled'
export type Measure = 'unit' | 'weight'

export type Customer = Base & {
  name: string
  nameKey: string
  phone?: string
  notes?: string
  mergedInto?: string
}

export type Order = Base & {
  customer: string
  pickupAt: string
  status: OrderStatus
  deliveredAt?: string
  important: boolean
  notes: string
}

export type OrderItem = Base & {
  order: string
  name: string
  measure: Measure
  quantity: number
  orderedGrams?: number | null
  prepDayBefore: boolean
  done: boolean
  position: number
  notes?: string
  unitPriceCents?: number | null
  weightGrams?: number | null
}

export type Ticket = Base & {
  customer: string
  amountCents: number
  notes: string
  photo?: string
  paid: boolean
  paidAt?: string
}

/** Company catalogue entry. Order items copy its values; they keep no link to it. */
export type Product = Base & {
  name: string
  nameKey: string
  measure: Measure
  prepDayBefore: boolean
  unitPriceCents?: number | null
  notes?: string
}

export type CollectionName =
  | 'customers'
  | 'products'
  | 'orders'
  | 'order_items'
  | 'tickets'
