/**
 * Calendar helpers for the day workspace. Days are "YYYY-MM-DD" strings in
 * Europe/Madrid; instants are UTC ISO strings. No `Intl`: the Madrid offset
 * comes from the EU rule (last Sunday of March / October at 01:00 UTC), the
 * same one `@shared/progress` uses for `madridDay`.
 */
import { ca, es } from 'date-fns/locale'
import { madridDay } from '@shared/progress'

const HOUR = 3600000
const DAY = 24 * HOUR

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const MONTH_RE = /^(\d{4})-(\d{2})$/
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

function pad(n: number, len = 2): string {
  return String(n).padStart(len, '0')
}

function toDay(ms: number): string {
  const d = new Date(ms)
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

function dayToUtcMs(day: string): number {
  const m = DAY_RE.exec(day)
  if (!m) throw new RangeError(`Invalid day: ${day}`)
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

function lastSunday0100Utc(year: number, month: number): number {
  const dow = new Date(Date.UTC(year, month, 31)).getUTCDay()
  return Date.UTC(year, month, 31 - dow, 1)
}

/** Madrid offset from UTC in hours (1 winter, 2 summer) at a UTC instant. */
function offsetAt(ms: number): 1 | 2 {
  const year = new Date(ms).getUTCFullYear()
  return ms >= lastSunday0100Utc(year, 2) && ms < lastSunday0100Utc(year, 9)
    ? 2
    : 1
}

/** True for a real calendar day written as "YYYY-MM-DD". */
export function isDay(value: string): boolean {
  const m = DAY_RE.exec(value)
  if (!m) return false
  return toDay(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) === value
}

/** Today's day in Madrid. */
export function todayMadrid(now: Date = new Date()): string {
  return madridDay(now.toISOString())
}

/** `day` shifted by `days` calendar days. */
export function addDays(day: string, days: number): string {
  return toDay(dayToUtcMs(day) + days * DAY)
}

export const previousDay = (day: string): string => addDays(day, -1)
export const nextDay = (day: string): string => addDays(day, 1)

/** "YYYY-MM" of a day. */
export function monthOf(day: string): string {
  return day.slice(0, 7)
}

/** "YYYY-MM" shifted by `months`. */
export function addMonths(month: string, months: number): string {
  const m = MONTH_RE.exec(month)
  if (!m) throw new RangeError(`Invalid month: ${month}`)
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1 + months, 1))
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}`
}

/** First and last day of a "YYYY-MM" month. */
export function monthBounds(month: string): { first: string; last: string } {
  const m = MONTH_RE.exec(month)
  if (!m) throw new RangeError(`Invalid month: ${month}`)
  const lastDate = new Date(
    Date.UTC(Number(m[1]), Number(m[2]), 0),
  ).getUTCDate()
  return { first: `${month}-01`, last: `${month}-${pad(lastDate)}` }
}

/** Day of the week, Monday = 0 ... Sunday = 6. */
export function weekdayIndex(day: string): number {
  return (new Date(dayToUtcMs(day)).getUTCDay() + 6) % 7
}

/** The 7 days (Monday to Sunday) of the week containing `day`. */
export function weekDays(day: string): string[] {
  const monday = addDays(day, -weekdayIndex(day))
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

/** Whole weeks (Monday to Sunday) covering a "YYYY-MM" month, flattened. */
export function monthGrid(month: string): string[] {
  const { first, last } = monthBounds(month)
  const start = addDays(first, -weekdayIndex(first))
  const end = addDays(last, 6 - weekdayIndex(last))
  const days: string[] = []
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d)
  return days
}

/**
 * Local-time Date at noon of a Madrid day, for formatting the day with date-fns
 * (never for calculations).
 */
export function dayToDisplayDate(day: string): Date {
  const m = DAY_RE.exec(day)
  if (!m) throw new RangeError(`Invalid day: ${day}`)
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12)
}

/**
 * UTC ISO instant of a Madrid wall-clock time. A time repeated in October
 * resolves to the first (summer) one; a time skipped in March moves forward
 * one hour (02:30 becomes 03:30).
 */
export function madridDateTimeToUtcIso(day: string, time: string): string {
  const t = TIME_RE.exec(time)
  if (!t) throw new RangeError(`Invalid time: ${time}`)
  const local = dayToUtcMs(day) + Number(t[1]) * HOUR + Number(t[2]) * 60000
  for (const offset of [2, 1] as const) {
    const utc = local - offset * HOUR
    if (offsetAt(utc) === offset) return new Date(utc).toISOString()
  }
  return new Date(local - HOUR).toISOString()
}

/** Madrid wall-clock time ("HH:mm", 24 h) of a UTC ISO instant. */
export function utcIsoToMadridTime(iso: string): string {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) throw new RangeError(`Invalid date: ${iso}`)
  const d = new Date(ms + offsetAt(ms) * HOUR)
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

/** UTC range of a Madrid day: `from` inclusive, `to` exclusive (midnight to midnight). */
export function madridDayRangeUtc(day: string): { from: string; to: string } {
  return {
    from: madridDateTimeToUtcIso(day, '00:00'),
    to: madridDateTimeToUtcIso(nextDay(day), '00:00'),
  }
}

/** UTC range of a Madrid month ("YYYY-MM"): `from` inclusive, `to` exclusive. */
export function madridMonthRangeUtc(month: string): {
  from: string
  to: string
} {
  const { first, last } = monthBounds(month)
  return {
    from: madridDayRangeUtc(first).from,
    to: madridDayRangeUtc(last).to,
  }
}

/** date-fns locale for a UI language ("es" or, by default, "ca"). */
export function dateLocale(language: string) {
  return language === 'es' ? es : ca
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
