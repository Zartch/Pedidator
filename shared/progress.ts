import type { Order, OrderItem } from './types'

const HOUR = 3600000

/** Last Sunday of the given month (0-based) at 01:00 UTC, in ms. Month must have 31 days. */
function lastSunday0100Utc(year: number, month: number): number {
  const dow = new Date(Date.UTC(year, month, 31)).getUTCDay()
  return Date.UTC(year, month, 31 - dow, 1)
}

/** Europe/Madrid offset in hours (1 winter, 2 summer) without Intl. */
function madridOffsetHours(ms: number): number {
  const year = new Date(ms).getUTCFullYear()
  const start = lastSunday0100Utc(year, 2)
  const end = lastSunday0100Utc(year, 9)
  return ms >= start && ms < end ? 2 : 1
}

function pad(n: number, len = 2): string {
  return String(n).padStart(len, '0')
}

/** Madrid calendar day ("YYYY-MM-DD") of a UTC ISO instant. */
export function madridDay(utcIso: string): string {
  const ms = Date.parse(utcIso)
  if (Number.isNaN(ms)) throw new RangeError(`Invalid date: ${utcIso}`)
  const d = new Date(ms + madridOffsetHours(ms) * HOUR)
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** Natural day before the pickup day, in Madrid. */
export function prepDay(pickupAtUtcIso: string): string {
  const [y, m, d] = madridDay(pickupAtUtcIso).split('-').map(Number)
  const prev = new Date(Date.UTC(y, m - 1, d - 1))
  return `${pad(prev.getUTCFullYear(), 4)}-${pad(prev.getUTCMonth() + 1)}-${pad(prev.getUTCDate())}`
}

function active(items: OrderItem[]): OrderItem[] {
  return items.filter((i) => !i.deleted)
}

export function isPrepared(items: OrderItem[]): boolean {
  const list = active(items)
  return list.length > 0 && list.every((i) => i.done)
}

export function orderProgress(items: OrderItem[]): {
  done: number
  total: number
  prepared: boolean
} {
  const list = active(items)
  const done = list.filter((i) => i.done).length
  return { done, total: list.length, prepared: list.length > 0 && done === list.length }
}

export function dayProgress(
  orders: Order[],
  itemsByOrder: Map<string, OrderItem[]>,
): { total: number; prepared: number; delivered: number } {
  let total = 0
  let prepared = 0
  let delivered = 0
  for (const o of orders) {
    if (o.deleted || o.status === 'cancelled') continue
    total++
    if (o.status === 'delivered') {
      delivered++
      prepared++
    } else if (isPrepared(itemsByOrder.get(o.id) ?? [])) {
      prepared++
    }
  }
  return { total, prepared, delivered }
}

export function needsPrepAhead(items: OrderItem[]): boolean {
  return active(items).some((i) => i.prepDayBefore)
}

export function isPrepLate(
  item: OrderItem,
  pickupAtUtcIso: string,
  todayMadrid: string,
): boolean {
  if (item.deleted || !item.prepDayBefore || item.done) return false
  return todayMadrid >= madridDay(pickupAtUtcIso)
}
