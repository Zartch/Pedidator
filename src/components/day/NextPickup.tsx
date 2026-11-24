import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { DayOrder } from '@/data/hooks'
import { utcIsoToMadridTime } from '@/lib/dates'

/** Highlighted summary of the next order to hand over (only meaningful on today). */
export function NextPickup({ data }: { data: DayOrder }) {
  const { t } = useTranslation('day')
  return (
    <section
      aria-label={t('next.label')}
      className="rounded-md border-[1.5px] border-brand-strong bg-brand-soft px-4 py-3"
    >
      <div className="text-(length:--type-caption-size) leading-(--type-caption-line) font-semibold text-brand-strong">
        {t('next.label')}
      </div>
      <div className="flex items-baseline gap-3">
        <span className="font-display text-[24px] leading-7 font-bold tabular-nums">
          {utcIsoToMadridTime(data.order.pickupAt)}
        </span>
        <Link
          to={`/orders/${data.order.id}`}
          className="min-w-0 truncate py-2 font-semibold text-ink"
        >
          {data.customer?.name ?? t('card.unknownCustomer')}
        </Link>
      </div>
    </section>
  )
}
