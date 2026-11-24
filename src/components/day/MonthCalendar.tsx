import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { DayMarks } from '@/data/hooks'
import { Button } from '@/components/ui/Button'
import {
  addMonths,
  capitalize,
  dateLocale,
  dayToDisplayDate,
  monthBounds,
  monthGrid,
  monthOf,
} from '@/lib/dates'
import { cn } from '@/lib/utils'

export type CalendarProps = {
  /** Selected day. */
  day: string
  today: string
  marks: Record<string, DayMarks>
  onSelect: (day: string) => void
}

const DOW_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

export function WeekdayHeaders() {
  const { t } = useTranslation('day')
  return DOW_KEYS.map((k) => (
    <span
      key={k}
      className="pb-0.5 text-center text-(length:--type-caption-size) leading-(--type-caption-line) font-semibold text-ink-muted"
    >
      {t(`calendar.dow.${k}`)}
    </span>
  ))
}

type DayButtonProps = {
  day: string
  selected: boolean
  today: boolean
  outside?: boolean
  marks?: DayMarks
  onSelect: (day: string) => void
}

/** One day of the calendar with its three marks: dot (orders), diamond (important), bar (prepare ahead). */
export function CalendarDay({
  day,
  selected,
  today,
  outside,
  marks,
  onSelect,
}: DayButtonProps) {
  const { t, i18n } = useTranslation('day')
  const locale = dateLocale(i18n.language)
  const date = dayToDisplayDate(day)
  const markNames = [
    marks?.hasOrders && t('calendar.mark.orders'),
    marks?.important && t('calendar.mark.important'),
    marks?.prepAhead && t('calendar.mark.prep'),
  ].filter(Boolean)
  const label = [format(date, 'EEEE d MMMM', { locale }), ...markNames].join(
    ', ',
  )

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      aria-current={today ? 'date' : undefined}
      onClick={() => onSelect(day)}
      className={cn(
        'flex min-h-(--touch-min) cursor-pointer flex-col items-center justify-center gap-[3px] rounded-sm border-0 bg-transparent p-0 text-(length:--type-body-size) leading-5 font-semibold text-ink tabular-nums focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-strong',
        outside && 'font-normal text-ink-muted',
        marks?.important && 'bg-warn-soft',
        marks?.prepAhead &&
          'bg-prep-soft shadow-[inset_0_0_0_1.5px_var(--prep)]',
        today && 'underline decoration-2 underline-offset-[3px]',
        selected &&
          'bg-brand text-on-brand shadow-[inset_0_0_0_1.5px_var(--brand-strong)]',
      )}
    >
      {format(date, 'd')}
      <span className="flex h-[7px] items-center gap-[3px]" aria-hidden="true">
        {marks?.hasOrders && (
          <i
            className={cn(
              'size-1.5 rounded-full',
              selected ? 'bg-on-brand' : 'bg-brand-strong',
            )}
          />
        )}
        {marks?.important && (
          <i
            className={cn(
              'size-1.5 rotate-45',
              selected ? 'bg-on-brand' : 'bg-warn',
            )}
          />
        )}
        {marks?.prepAhead && (
          <i
            className={cn(
              'h-[5px] w-2.5 rounded-[2px]',
              selected ? 'bg-on-brand' : 'bg-prep',
            )}
          />
        )}
      </span>
    </button>
  )
}

/** Month grid (tablet and up), Monday first. Days of neighbouring months are muted but selectable. */
export function MonthCalendar({ day, today, marks, onSelect }: CalendarProps) {
  const { t, i18n } = useTranslation('day')
  const locale = dateLocale(i18n.language)
  const month = monthOf(day)
  const monthName = capitalize(
    format(dayToDisplayDate(`${month}-01`), 'LLLL yyyy', { locale }),
  )
  const move = (delta: number) => {
    // Keep the day of the month when it exists, else the last day.
    const target = addMonths(month, delta)
    const dd = Math.min(
      Number(day.slice(8)),
      Number(monthBounds(target).last.slice(8)),
    )
    onSelect(`${target}-${String(dd).padStart(2, '0')}`)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 font-semibold">{monthName}</span>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('calendar.monthPrevious')}
          onClick={() => move(-1)}
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('calendar.monthNext')}
          onClick={() => move(1)}
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </Button>
      </div>
      <div
        role="group"
        aria-label={t('calendar.month', { month: monthName })}
        className="grid grid-cols-7 gap-1"
      >
        <WeekdayHeaders />
        {monthGrid(month).map((d) => (
          <CalendarDay
            key={d}
            day={d}
            selected={d === day}
            today={d === today}
            outside={monthOf(d) !== month}
            marks={marks[d]}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}

/** Key to the three calendar marks (shape and word, never color alone). */
export function CalendarLegend() {
  const { t } = useTranslation('day')
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-(length:--type-caption-size) leading-(--type-caption-line) font-medium text-ink-muted">
      <span className="inline-flex items-center gap-1.5">
        <i
          className="size-1.5 rounded-full bg-brand-strong"
          aria-hidden="true"
        />
        {t('calendar.legend.orders')}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <i className="size-1.5 rotate-45 bg-warn" aria-hidden="true" />
        {t('calendar.legend.important')}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <i className="h-[5px] w-2.5 rounded-[2px] bg-prep" aria-hidden="true" />
        {t('calendar.legend.prep')}
      </span>
    </div>
  )
}
