import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Check, Circle, Flag, PackageCheck } from 'lucide-react'
import { isPrepLate, orderProgress } from '@shared/progress'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { AppDialog } from '@/components/ui/AppDialog'
import type { DayOrder } from '@/data/hooks'
import { deliverOrder } from '@/data/repo/orders'
import { utcIsoToMadridTime } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { ItemCheckRow } from './ItemCheckRow'

type Props = {
  data: DayOrder
  /** Today in Madrid, to flag items that should have been prepared yesterday. */
  today: string
  isNext?: boolean
}

/**
 * Workspace card of a pending order: time, customer, calculated state and its
 * items, which are ticked right here. No prices (docs/design, DayWorkspace).
 */
export function OrderCard({ data, today, isNext = false }: Props) {
  const { t } = useTranslation('day')
  const { order, customer, items } = data
  const progress = orderProgress(items)
  const [confirming, setConfirming] = useState(false)

  async function deliver() {
    setConfirming(false)
    await deliverOrder(order.id)
  }

  return (
    <article
      className={cn(
        'overflow-hidden rounded-md border border-line bg-surface-raised',
        isNext &&
          'border-brand-strong shadow-[0_0_0_1.5px_var(--brand-strong)]',
      )}
    >
      {isNext && (
        <div className="bg-brand-soft px-4 py-1 text-(length:--type-caption-size) leading-(--type-caption-line) font-semibold text-brand-strong">
          {t('card.next')}
        </div>
      )}
      <div
        className={cn(
          'flex items-center gap-3 border-b border-line px-4 py-3',
          progress.prepared && 'border-b-transparent bg-ok-soft',
        )}
      >
        <span className="font-display text-[24px] leading-7 font-bold tabular-nums">
          {utcIsoToMadridTime(order.pickupAt)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Link
            to={`/orders/${order.id}`}
            className="-my-1 truncate py-1 font-semibold text-ink underline-offset-2 hover:underline"
          >
            {customer?.name ?? t('card.unknownCustomer')}
          </Link>
          <span className="flex flex-wrap gap-x-2 gap-y-1">
            {progress.prepared ? (
              <Badge variant="ok" icon={Check}>
                {t('card.prepared')}
              </Badge>
            ) : (
              <Badge variant="neutral" icon={Circle}>
                {progress.total === 0
                  ? t('card.noItems')
                  : t('card.toPrepare', {
                      done: progress.done,
                      total: progress.total,
                    })}
              </Badge>
            )}
            {order.important && (
              <Badge variant="warn" icon={Flag}>
                {t('card.important')}
              </Badge>
            )}
          </span>
        </div>
        <Button
          variant={progress.prepared ? 'primary' : 'secondary'}
          className="px-3 tablet:px-5"
          onClick={() =>
            progress.prepared ? void deliver() : setConfirming(true)
          }
        >
          <PackageCheck
            className="hidden size-5 tablet:block"
            aria-hidden="true"
          />
          {t('card.deliver')}
        </Button>
      </div>
      {items.length > 0 && (
        <div className="px-4">
          {items.map((item) => (
            <ItemCheckRow
              key={item.id}
              item={item}
              late={isPrepLate(item, order.pickupAt, today)}
            />
          ))}
        </div>
      )}
      {order.notes && (
        <p className="px-4 pb-3 text-(length:--type-caption-size) leading-(--type-caption-line) font-medium text-ink-muted">
          {order.notes}
        </p>
      )}
      {/* Mounted only while asking: a closed AppDialog is still laid out (see report). */}
      {confirming && (
        <AppDialog
          open
          title={t('deliverDialog.title')}
          onClose={() => setConfirming(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                {t('deliverDialog.cancel')}
              </Button>
              <Button variant="primary" onClick={() => void deliver()}>
                {t('deliverDialog.confirm')}
              </Button>
            </>
          }
        >
          <p>
            {t('deliverDialog.message', {
              done: progress.done,
              total: progress.total,
            })}
          </p>
        </AppDialog>
      )}
    </article>
  )
}
