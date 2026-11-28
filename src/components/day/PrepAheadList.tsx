import { useTranslation } from 'react-i18next'
import { Clock } from 'lucide-react'
import type { PrepAheadItem } from '@/data/hooks'
import { utcIsoToMadridTime } from '@/lib/dates'
import { ItemCheckRow } from './ItemCheckRow'

/** "Prepare today for tomorrow": `prepDayBefore` items of tomorrow's orders. Hidden when empty. */
export function PrepAheadList({ items }: { items: PrepAheadItem[] }) {
  const { t } = useTranslation('day')
  if (items.length === 0) return null
  const done = items.filter((p) => p.item.done).length

  return (
    <section
      aria-label={t('prep.title')}
      className="rounded-md border-[1.5px] border-prep bg-prep-soft px-4 py-2"
    >
      <h3 className="flex min-h-9 items-center gap-2 font-semibold text-prep">
        <Clock className="size-5" aria-hidden="true" />
        {t('prep.title')}
        <span className="ml-auto tabular-nums">
          {t('prep.count', { done, total: items.length })}
        </span>
      </h3>
      {items.map(({ item, order, customer }) => (
        <ItemCheckRow
          key={item.id}
          item={item}
          tone="prep"
          hidePrepBadge
          context={`${utcIsoToMadridTime(order.pickupAt)} · ${customer?.name ?? t('card.unknownCustomer')}`}
        />
      ))}
    </section>
  )
}
