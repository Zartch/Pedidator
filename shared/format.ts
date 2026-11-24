const MONEY_RE = /^(\d+)(?:[.,](\d{1,2}))?$/

/** "12,50" | "12.5" | "12" -> 1250. Invalid -> null. */
export function parseMoney(input: string): number | null {
  const m = MONEY_RE.exec(input.replace(/\s+/g, ''))
  if (!m) return null
  const cents = Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0') || '0')
  return Number.isSafeInteger(cents) ? cents : null
}

/** "12,50 €". Both ca and es use a decimal comma; no Intl (runs in goja). */
export function formatMoney(cents: number, locale: 'ca' | 'es'): string {
  void locale // ca and es format identically
  const abs = Math.abs(cents)
  const sign = cents < 0 ? '-' : ''
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')} €`
}
