import { Ban, Check, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useArchivedOrders, useCustomer, type DayOrder } from '@/data/hooks'
import { formatQuantity } from '@shared/weight'

const MADRID = 'Europe/Madrid'

const FIELD =
  'min-h-(--touch-min) w-full rounded-sm border-[1.5px] border-line-strong bg-surface-raised px-3 text-(length:--type-body-size) leading-(--type-body-line) text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-strong'

function formatTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: MADRID,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso))
}

function formatDay(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: MADRID,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(iso))
}

/** Archive: delivered and cancelled orders, searched by customer and pickup day. */
export default function ArchivePage() {
  const { t, i18n } = useTranslation('archive')
  const locale = i18n.language === 'es' ? 'es-ES' : 'ca-ES'

  const [params, setParams] = useSearchParams()
  const text = params.get('q') ?? ''
  const fromDay = params.get('from') ?? ''
  const toDay = params.get('to') ?? ''
  const customerId = params.get('customer') ?? ''
  const customer = useCustomer(customerId || undefined)

  /** Sets or removes URL filters, keeping the rest. */
  function setFilters(changes: Record<string, string>) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value)
          else next.delete(key)
        }
        return next
      },
      { replace: true },
    )
  }

  const orders = useArchivedOrders({
    text: text.trim() || undefined,
    fromDay: fromDay || undefined,
    toDay: toDay || undefined,
    customerId: customerId || undefined,
  })

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-(length:--type-title-size) leading-(--type-title-line) font-[650]">
        {t('title')}
      </h2>

      <div className="flex flex-col gap-3">
        {customerId && (
          <div>
            <span
              data-testid="customer-chip"
              className="inline-flex min-h-(--touch-min) items-center gap-2 rounded-full border-[1.5px] border-brand-strong bg-brand-soft pr-1 pl-4 font-semibold text-brand-strong"
            >
              {customer?.name ?? t('noCustomer')}
              <button
                type="button"
                aria-label={t('removeCustomer')}
                onClick={() => setFilters({ customer: '' })}
                className="flex size-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-brand-strong focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-strong"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </span>
          </div>
        )}
        <label className="flex flex-col gap-1 text-(length:--type-label-size) font-semibold text-ink-muted">
          {t('search.label')}
          <input
            type="search"
            className={FIELD}
            placeholder={t('search.placeholder')}
            value={text}
            onChange={(e) => setFilters({ q: e.target.value })}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-(length:--type-label-size) font-semibold text-ink-muted">
            {t('range.from')}
            <input
              type="date"
              className={FIELD}
              value={fromDay}
              onChange={(e) => setFilters({ from: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-(length:--type-label-size) font-semibold text-ink-muted">
            {t('range.to')}
            <input
              type="date"
              className={FIELD}
              value={toDay}
              onChange={(e) => setFilters({ to: e.target.value })}
            />
          </label>
        </div>

        {(fromDay || toDay) && (
          <div>
            <Button
              variant="ghost"
              onClick={() => setFilters({ from: '', to: '' })}
            >
              {t('range.clear')}
            </Button>
          </div>
        )}
      </div>

      {orders === undefined ? null : orders.length === 0 ? (
        <p className="text-ink-muted">{t('empty')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((d) => (
            <li key={d.order.id}>
              <ArchiveCard day={d} locale={locale} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ArchiveCard({ day, locale }: { day: DayOrder; locale: string }) {
  const { t } = useTranslation('archive')
  const { order, customer, items } = day
  const cancelled = order.status === 'cancelled'

  const itemsText = items
    .map((i) => [i.name, formatQuantity(i)].filter(Boolean).join(' '))
    .join(' · ')
  const meta = [
    formatDay(order.pickupAt, locale),
    itemsText || t('noItems'),
  ].join(' · ')

  return (
    <Link
      to={`/orders/${order.id}`}
      className="grid min-h-[72px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 rounded-md border border-line bg-surface-sunken px-4 py-3 text-ink-muted no-underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-strong"
    >
      <span className="row-span-2 font-display text-(length:--type-numeral-size) leading-(--type-numeral-line) font-[650] tabular-nums">
        {formatTime(order.pickupAt, locale)}
      </span>
      <span
        className={`truncate text-(length:--type-body-strong-size) leading-(--type-body-strong-line) font-semibold ${cancelled ? 'line-through' : ''}`}
      >
        {customer?.name ?? t('noCustomer')}
      </span>
      <span className="row-span-2 self-center">
        {cancelled ? (
          <Badge variant="neutral" icon={Ban}>
            {t('state.cancelled')}
          </Badge>
        ) : (
          <Badge variant="ok" icon={Check}>
            {t('state.delivered')}
          </Badge>
        )}
      </span>
      <span className="col-start-2 truncate text-(length:--type-caption-size) leading-(--type-caption-line) font-medium">
        {meta}
      </span>
    </Link>
  )
}
