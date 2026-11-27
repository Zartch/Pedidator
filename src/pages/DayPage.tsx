import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { CalendarDays, Plus } from 'lucide-react'
import { dayProgress } from '@shared/progress'
import type { OrderItem } from '@shared/types'
import {
  useDayOrders,
  useMonthDeliveredCount,
  useMonthMarks,
  usePrepAheadItems,
  type DayMarks,
} from '@/data/hooks'
import { Button } from '@/components/ui/Button'
import { DayHeader } from '@/components/day/DayHeader'
import { DayOrderList } from '@/components/day/DayOrderList'
import { DayProgress } from '@/components/day/DayProgress'
import { DeliveredGroup } from '@/components/day/DeliveredGroup'
import { CalendarLegend, MonthCalendar } from '@/components/day/MonthCalendar'
import { NextPickup } from '@/components/day/NextPickup'
import { PrepAheadList } from '@/components/day/PrepAheadList'
import { WeekStrip } from '@/components/day/WeekStrip'
import {
  addMonths,
  dateLocale,
  dayToDisplayDate,
  isDay,
  monthOf,
  nextDay,
  previousDay,
  todayMadrid,
} from '@/lib/dates'
import { cn } from '@/lib/utils'

const SHOW_DELIVERED_KEY = 'pedidator.showDelivered'
const PHONE_MONTH_KEY = 'pedidator.calendarMonth'

/** Device-remembered switches; off by default; storage can be blocked, then the choice lasts until the page reloads. */
function readFlag(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function writeFlag(key: string, value: boolean): void {
  try {
    window.localStorage.setItem(key, value ? '1' : '0')
  } catch {
    // Storage blocked: the choice lasts until the page reloads.
  }
}

const EMPTY_MARKS: Record<string, DayMarks> = {}

/** Day workspace: calendar, progress and the day's orders with their items to tick. */
export default function DayPage() {
  const { t, i18n } = useTranslation('day')
  const locale = dateLocale(i18n.language)
  const navigate = useNavigate()
  const { date } = useParams()
  const today = todayMadrid()
  const valid = date === undefined || isDay(date)
  const day = date !== undefined && valid ? date : today
  const isToday = day === today
  const month = monthOf(day)

  const [showDelivered, setShowDelivered] = useState(() =>
    readFlag(SHOW_DELIVERED_KEY),
  )
  // Phones show the week strip; this switches them to the whole month. Tablets always show the month.
  const [phoneMonth, setPhoneMonth] = useState(() => readFlag(PHONE_MONTH_KEY))

  const orders = useDayOrders(day)
  const prepAhead = usePrepAheadItems(day)
  const monthDelivered = useMonthDeliveredCount(month)
  // Marks of the neighbouring months too: the grid and the week show days of both.
  const markOptions = { includeArchived: showDelivered }
  const before = useMonthMarks(addMonths(month, -1), markOptions)
  const current = useMonthMarks(month, markOptions)
  const after = useMonthMarks(addMonths(month, 1), markOptions)
  const marks = {
    ...(before ?? EMPTY_MARKS),
    ...(current ?? EMPTY_MARKS),
    ...(after ?? EMPTY_MARKS),
  }

  if (!valid) return <Navigate to="/" replace />

  const dayOrders = orders ?? []
  const pending = dayOrders.filter((d) => d.order.status === 'pending')
  const delivered = dayOrders.filter((d) => d.order.status === 'delivered')
  const itemsByOrder = new Map<string, OrderItem[]>(
    dayOrders.map((d) => [d.order.id, d.items]),
  )
  const progress = dayProgress(
    dayOrders.map((d) => d.order),
    itemsByOrder,
  )
  const next = isToday ? pending[0] : undefined

  const select = (d: string) => void navigate(d === today ? '/' : `/day/${d}`)
  const monthName = format(dayToDisplayDate(`${month}-01`), 'LLLL', { locale })

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 wide:grid-cols-[var(--list-col)_minmax(0,1fr)] wide:items-start wide:gap-6">
      <div className="flex min-w-0 flex-col gap-4">
        <DayHeader
          day={day}
          isToday={isToday}
          previous={previousDay(day)}
          next={nextDay(day)}
          onSelect={select}
          onToday={() => select(today)}
        />
        <div className="flex flex-col gap-2 tablet:hidden">
          <div className="flex justify-end">
            <Button
              variant="ghost"
              aria-expanded={phoneMonth}
              aria-controls="day-calendar-phone"
              onClick={() => {
                writeFlag(PHONE_MONTH_KEY, !phoneMonth)
                setPhoneMonth(!phoneMonth)
              }}
            >
              <CalendarDays className="size-5" aria-hidden="true" />
              {phoneMonth ? t('calendar.showWeek') : t('calendar.showMonth')}
            </Button>
          </div>
          <div id="day-calendar-phone">
            {phoneMonth ? (
              <MonthCalendar
                day={day}
                today={today}
                marks={marks}
                onSelect={select}
              />
            ) : (
              <WeekStrip
                day={day}
                today={today}
                marks={marks}
                onSelect={select}
              />
            )}
          </div>
        </div>
        <div className="hidden tablet:block">
          <MonthCalendar
            day={day}
            today={today}
            marks={marks}
            onSelect={select}
          />
        </div>
        <CalendarLegend />
        <DayProgress
          total={progress.total}
          prepared={progress.prepared}
          delivered={progress.delivered}
          monthDelivered={
            monthDelivered === undefined
              ? undefined
              : { count: monthDelivered, monthName }
          }
        />
        {next && (
          <div className="hidden wide:block">
            <NextPickup data={next} />
          </div>
        )}
        {isToday && <PrepAheadList items={prepAhead ?? []} />}
      </div>

      <section className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 tablet:grid-cols-[minmax(0,1fr)_auto] tablet:items-center">
        <h3 className="sr-only font-semibold text-(length:--type-heading-size) leading-(--type-heading-line) tablet:not-sr-only tablet:col-start-1 tablet:row-start-1">
          {isToday ? t('orders.headingToday') : t('orders.heading')}
        </h3>
        <Link
          to={`/orders/new?date=${day}`}
          className={cn(
            'inline-flex min-h-(--touch-lg) items-center justify-center gap-2 rounded-md border-[1.5px] border-brand-strong bg-brand px-6 text-[18px] leading-6 font-semibold text-on-brand focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-strong active:brightness-95',
            'order-last sticky bottom-[calc(var(--bar-height)+env(safe-area-inset-bottom)+0.75rem)] z-[5] shadow-overlay',
            'tablet:static tablet:order-none tablet:col-start-2 tablet:row-start-1 tablet:shadow-none',
          )}
        >
          <Plus className="size-5" aria-hidden="true" />
          {t('orders.new')}
        </Link>
        <div className="flex flex-col gap-3 tablet:col-span-2">
          <DayOrderList
            orders={pending}
            today={today}
            nextId={next?.order.id}
          />
          <button
            type="button"
            role="switch"
            aria-checked={showDelivered}
            onClick={() => {
              writeFlag(SHOW_DELIVERED_KEY, !showDelivered)
              setShowDelivered(!showDelivered)
            }}
            className="flex min-h-(--touch-min) cursor-pointer items-center gap-3 border-0 bg-transparent p-0 text-left font-medium text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-strong"
          >
            <span
              className={cn(
                'relative h-8 w-[52px] flex-none rounded-pill after:absolute after:top-1.5 after:left-1.5 after:size-5 after:rounded-full after:transition-transform motion-reduce:after:transition-none',
                showDelivered
                  ? 'bg-prep after:translate-x-5 after:bg-on-status'
                  : 'bg-surface-raised shadow-[inset_0_0_0_2px_var(--line-strong)] after:bg-line-strong',
              )}
            />
            {t('calendar.showDelivered')}
          </button>
          <DeliveredGroup orders={delivered} />
        </div>
      </section>
    </div>
  )
}
