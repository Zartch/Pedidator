import type { OrderItem } from './types'

type PriceFields = Pick<
  OrderItem,
  'measure' | 'unitPriceCents' | 'quantity' | 'orderedGrams' | 'weightGrams'
>

/** Line amount in cents, or null when there is no price (or nothing to multiply). */
export function lineCents(item: PriceFields): { cents: number; estimated: boolean } | null {
  const price = item.unitPriceCents
  if (price == null) return null
  if (item.measure === 'unit') return { cents: item.quantity * price, estimated: false }
  if (item.weightGrams != null) {
    return { cents: Math.round((item.weightGrams * price) / 1000), estimated: false }
  }
  if (item.orderedGrams != null) {
    return { cents: Math.round((item.orderedGrams * price) / 1000), estimated: true }
  }
  return null
}

export function orderTotal(
  items: OrderItem[],
): { cents: number; estimated: boolean; unpriced: number } | null {
  let cents = 0
  let estimated = false
  let priced = 0
  let unpriced = 0
  for (const item of items) {
    if (item.deleted) continue
    const line = lineCents(item)
    if (!line) {
      unpriced++
      continue
    }
    priced++
    cents += line.cents
    if (line.estimated) estimated = true
  }
  return priced === 0 ? null : { cents, estimated, unpriced }
}
