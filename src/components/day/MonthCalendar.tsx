import {
  memo,
  type Ref,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { DayMarks } from '@/data/hooks'
import { Button } from '@/components/ui/Button'
import {
  capitalize,
  dateLocale,
  dayToDisplayDate,
  monthGrid,
  monthOf,
  monthsAround,
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
function CalendarDayView({
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

/** Memoised: the drag windows render hundreds of days, so only a changed day re-renders. */
export const CalendarDay = memo(
  CalendarDayView,
  (a, b) =>
    a.day === b.day &&
    a.selected === b.selected &&
    a.today === b.today &&
    a.outside === b.outside &&
    a.onSelect === b.onSelect &&
    a.marks?.hasOrders === b.marks?.hasOrders &&
    a.marks?.important === b.marks?.important &&
    a.marks?.prepAhead === b.marks?.prepAhead,
)

type MonthSectionProps = {
  month: string
  selectedDay?: string
  today: string
  marks: Record<string, DayMarks>
  onSelect: (day: string) => void
  ref?: Ref<HTMLElement>
}

/** One month: its title and a 7 x 6 grid (always six rows, so every month is as tall). */
const MonthSection = memo(function MonthSection({
  month,
  selectedDay,
  today,
  marks,
  onSelect,
  ref,
}: MonthSectionProps) {
  const { t, i18n } = useTranslation('day')
  const name = capitalize(
    format(dayToDisplayDate(`${month}-01`), 'LLLL yyyy', {
      locale: dateLocale(i18n.language),
    }),
  )
  return (
    <section
      ref={ref}
      className="flex snap-start snap-always flex-col gap-2 pb-1"
    >
      <span className="flex min-h-(--touch-min) items-center font-semibold">
        {name}
      </span>
      <div
        role="group"
        aria-label={t('calendar.month', { month: name })}
        className="grid grid-cols-7 grid-rows-[auto_repeat(6,var(--touch-min))] gap-1"
      >
        <WeekdayHeaders />
        {monthGrid(month).map((d) => (
          <CalendarDay
            key={d}
            day={d}
            selected={d === selectedDay}
            today={d === today}
            outside={monthOf(d) !== month}
            marks={marks[d]}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  )
})

export const MONTH_WINDOW = 12

export type MonthCalendarProps = CalendarProps & {
  /** Month ("YYYY-MM") to show on mount and whenever the day changes; defaults to the selected day's month. */
  anchor?: string
  /** Called with the month in view after each drag (and once on placement). */
  onVisibleMonthChange?: (month: string) => void
}

/**
 * Months stacked vertically, dragged with native scroll-snap (one month per
 * snap). Dragging changes only the visible month, never the selected day.
 * Days of neighbouring months are muted but selectable.
 */
export const MonthCalendar = memo(function MonthCalendar({
  day,
  today,
  marks,
  onSelect,
  anchor,
  onVisibleMonthChange,
}: MonthCalendarProps) {
  const { t } = useTranslation('day')
  const center = anchor ?? monthOf(day)
  const months = useMemo(() => monthsAround(center, MONTH_WINDOW), [center])
  const scrollRef = useRef<HTMLDivElement>(null)
  const firstRef = useRef<HTMLElement>(null)
  const visibleRef = useRef(center)
  const notifyRef = useRef(onVisibleMonthChange)
  const [height, setHeight] = useState<number>()
  useEffect(() => {
    notifyRef.current = onVisibleMonthChange
  })

  // Place on the anchored month without animation, and keep it there on resize.
  useLayoutEffect(() => {
    const el = scrollRef.current
    const first = firstRef.current
    if (!el || !first) return
    visibleRef.current = center
    notifyRef.current?.(center)
    const place = () => {
      const h = first.offsetHeight
      setHeight(h > 0 ? h : undefined)
      if (h === 0) return
      el.scrollTop = Math.max(0, months.indexOf(visibleRef.current)) * h
    }
    place()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(place)
    ro.observe(first)
    return () => ro.disconnect()
  }, [center, months])

  const onScroll = () => {
    const el = scrollRef.current
    const h = firstRef.current?.offsetHeight ?? 0
    if (!el || h === 0) return
    const idx = Math.min(
      months.length - 1,
      Math.max(0, Math.round(el.scrollTop / h)),
    )
    const m = months[idx]
    if (m !== visibleRef.current) {
      visibleRef.current = m
      notifyRef.current?.(m)
    }
  }

  const step = (delta: number) => {
    const el = scrollRef.current
    const h = firstRef.current?.offsetHeight ?? 0
    const idx = months.indexOf(visibleRef.current) + delta
    if (!el || h === 0 || idx < 0 || idx >= months.length) return
    el.scrollTo({ top: idx * h, behavior: 'smooth' })
  }

  return (
    <div className="relative">
      <div className="absolute top-0 right-0 z-[1] flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('calendar.monthPrevious')}
          onClick={() => step(-1)}
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('calendar.monthNext')}
          onClick={() => step(1)}
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </Button>
      </div>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        style={height ? { height } : undefined}
        className="snap-y snap-mandatory overflow-y-auto overscroll-y-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {months.map((m, i) => (
          <MonthSection
            key={m}
            ref={i === 0 ? firstRef : undefined}
            month={m}
            selectedDay={day}
            today={today}
            marks={marks}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
})

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
