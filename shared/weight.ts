import type { OrderItem } from './types'

const WEIGHT_RE = /^(\d+)(?:[.,](\d+))?\s*(kg|g)?$/i

/** Parses a weight typed by the user into integer grams, or null if invalid. */
export function parseWeight(input: string, unit: 'g' | 'kg'): number | null {
  const m = WEIGHT_RE.exec(input.trim())
  if (!m) return null
  const intPart = m[1]
  const frac = m[2]
  const u = m[3] ? (m[3].toLowerCase() as 'g' | 'kg') : unit
  let grams: number
  if (u === 'g') {
    if (frac !== undefined) return null
    grams = Number(intPart)
  } else {
    if (frac !== undefined && frac.length > 3) return null
    grams = Number(intPart) * 1000 + Number((frac ?? '').padEnd(3, '0') || '0')
  }
  if (!Number.isSafeInteger(grams) || grams <= 0) return null
  return grams
}

function kgString(grams: number): string {
  const kg = Math.floor(grams / 1000)
  const rest = grams % 1000
  if (rest === 0) return String(kg)
  return `${kg},${String(rest).padStart(3, '0').replace(/0+$/, '')}`
}

export function formatWeight(grams: number): string {
  return grams < 1000 ? `${grams} g` : `${kgString(grams)} kg`
}

export function toInputValue(grams: number, unit: 'g' | 'kg'): string {
  return unit === 'g' ? String(grams) : kgString(grams)
}

export function displayUnit(grams: number): 'g' | 'kg' {
  return grams < 1000 ? 'g' : 'kg'
}

export function formatQuantity(
  item: Pick<OrderItem, 'measure' | 'quantity' | 'orderedGrams'>,
): string {
  if (item.measure === 'unit') return `${item.quantity} u`
  return item.orderedGrams ? formatWeight(item.orderedGrams) : ''
}
