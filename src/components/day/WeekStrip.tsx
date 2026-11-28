import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import {
  addDays,
  dateLocale,
  dayToDisplayDate,
  weekDays,
  weekMonday,
  weeksAround,
} from '@/lib/dates'
import {
  CalendarDay,
  WeekdayHeaders,
  type CalendarProps,
} from './MonthCalendar'

export const WEEK_WINDOW = 26

export type WeekStripProps = CalendarProps & {
  /** Monday of the week to show on mount and whenever the day changes; defaults to the selected day's week. */
  anchor?: string
  /** Called with the Monday of the week in view after each drag (and once on placement). */
  onVisibleWeekChange?: (monday: string) => void
}

/**
 * Weeks (Monday to Sunday) side by side, dragged with native scroll-snap (one
 * week per snap). Dragging changes only the visible week, never the selected day.
 */
export const WeekStrip = memo(function WeekStrip({
  day,
  today,
  marks,
  onSelect,
  anchor,
  onVisibleWeekChange,
}: WeekStripProps) {
  const { t, i18n } = useTranslation('day')
  const locale = dateLocale(i18n.language)
  const center = weekMonday(anchor ?? day)
  const weeks = useMemo(() => weeksAround(center, WEEK_WINDOW), [center])
  const scrollRef = useRef<HTMLDivElement>(null)
  const visibleRef = useRef(center)
  const notifyRef = useRef(onVisibleWeekChange)
  const [visible, setVisible] = useState(center)
  useEffect(() => {
    notifyRef.current = onVisibleWeekChange
  })

  // Place on the anchored week without animation, and keep it there on resize.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    visibleRef.current = center
    setVisible(center)
    notifyRef.current?.(center)
    const place = () => {
      const w = el.clientWidth
      if (w === 0) return
      el.scrollLeft = Math.max(0, weeks.indexOf(visibleRef.current)) * w
    }
    place()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(place)
    ro.observe(el)
    return () => ro.disconnect()
  }, [center, weeks])

  const onScroll = () => {
    const el = scrollRef.current
    if (!el || el.clientWidth === 0) return
    const idx = Math.min(
      weeks.length - 1,
      Math.max(0, Math.round(el.scrollLeft / el.clientWidth)),
    )
    const monday = weeks[idx]
    if (monday !== visibleRef.current) {
      visibleRef.current = monday
      setVisible(monday)
      notifyRef.current?.(monday)
    }
  }

  const fmt = (d: string, pattern: string) =>
    format(dayToDisplayDate(d), pattern, { locale })
  // "1 – 7 desembre" inside a month, "29 novembre – 5 desembre" across two.
  const sameMonth = visible.slice(0, 7) === addDays(visible, 6).slice(0, 7)
  const title = `${fmt(visible, sameMonth ? 'd' : 'd MMMM')} – ${fmt(addDays(visible, 6), 'd MMMM')}`

  return (
    <div className="flex flex-col gap-1">
      <span className="text-center font-semibold" data-testid="week-title">
        {title}
      </span>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {weeks.map((monday) => (
          <div
            key={monday}
            role="group"
            aria-label={t('calendar.week', {
              from: fmt(monday, 'd MMMM'),
              to: fmt(addDays(monday, 6), 'd MMMM'),
            })}
            className="grid w-full flex-none snap-start snap-always grid-cols-7 gap-1"
          >
            <WeekdayHeaders />
            {weekDays(monday).map((d) => (
              <CalendarDay
                key={d}
                day={d}
                selected={d === day}
                today={d === today}
                marks={marks[d]}
                onSelect={onSelect}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
})
