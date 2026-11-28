import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, PackageCheck, Undo2 } from 'lucide-react'
import { useActionRunner } from '@/components/ui/ActionError'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { reopenOrder } from '@/data/repo/orders'
import type { DayOrder } from '@/data/hooks'
import { utcIsoToMadridTime } from '@/lib/dates'

/** Delivered orders of the day: folded at the end of the list, still counted in the progress. */
export function DeliveredGroup({ orders }: { orders: DayOrder[] }) {
  const { t } = useTranslation('day')
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const { run, alert } = useActionRunner()
  if (orders.length === 0) return null
  const Chevron = open ? ChevronUp : ChevronDown

  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-(--touch-min) w-full cursor-pointer items-center justify-between gap-3 rounded-md border-[1.5px] border-dashed border-line-strong bg-transparent px-4 text-left text-(length:--type-label-size) leading-(--type-label-line) font-semibold text-ink-muted focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-strong"
      >
        {t('deliveredGroup.title', { count: orders.length })}
        <Chevron className="size-5" aria-hidden="true" />
      </button>
      {open && (
        <ul id={panelId} className="flex flex-col gap-2">
          {orders.map(({ order, customer }) => (
            <li key={order.id} className="flex flex-col gap-2">
              <Link
                to={`/orders/${order.id}`}
                className="grid min-h-[72px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 rounded-md border border-line bg-surface-sunken px-4 py-3 text-ink-muted"
              >
                <span className="font-display text-[20px] leading-6 font-[650] tabular-nums">
                  {utcIsoToMadridTime(order.pickupAt)}
                </span>
                <span className="truncate font-semibold line-through">
                  {customer?.name ?? t('card.unknownCustomer')}
                </span>
                <Badge variant="ok" icon={PackageCheck}>
                  {t('card.delivered')}
                </Badge>
              </Link>
              <Button
                className="self-end"
                onClick={() => run(() => reopenOrder(order.id))}
              >
                <Undo2 className="size-5" aria-hidden="true" />
                {t('deliveredGroup.reopen')}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {alert}
    </section>
  )
}
