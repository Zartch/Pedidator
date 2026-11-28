import { useTranslation } from 'react-i18next'
import { AlarmClock, Check, Clock } from 'lucide-react'
import { formatQuantity } from '@shared/weight'
import type { OrderItem } from '@shared/types'
import { useActionRunner } from '@/components/ui/ActionError'
import { Badge } from '@/components/ui/Badge'
import { setItemDone } from '@/data/repo/orderItems'
import { cn } from '@/lib/utils'

type Props = {
  item: OrderItem
  /** Not prepared yet and the day to prepare it has passed ("había que prepararlo ayer"). */
  late?: boolean
  /** Extra line under the name (customer and time in "prepare today for tomorrow"). */
  context?: string
  /** Hides the "day before" badge (already obvious in its own section). */
  hidePrepBadge?: boolean
  tone?: 'default' | 'prep'
}

/**
 * Item with a checkbox, quantity and notes. Tapping the whole row marks it
 * (docs/design, ItemRow). It is the same `done` flag wherever it is shown.
 */
export function ItemCheckRow({
  item,
  late,
  context,
  hidePrepBadge,
  tone = 'default',
}: Props) {
  const { t } = useTranslation('day')
  const quantity = formatQuantity(item)
  const { run, alert } = useActionRunner()

  return (
    <>
      <button
        type="button"
        role="checkbox"
        aria-checked={item.done}
        onClick={() => run(() => setItemDone(item.id, !item.done))}
        className={cn(
          'flex min-h-(--touch-lg) w-full cursor-pointer items-center gap-3 border-0 border-b bg-transparent py-2 text-left text-ink [-webkit-tap-highlight-color:transparent] last:border-b-0 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-strong',
          tone === 'prep' ? 'border-prep' : 'border-line',
        )}
      >
        <span
          className={cn(
            'grid size-8 flex-none place-items-center rounded-sm border-2',
            item.done
              ? 'border-ok bg-ok text-on-status'
              : 'border-line-strong bg-surface-raised text-transparent',
          )}
        >
          <Check className="size-5" aria-hidden="true" />
        </span>
        <span className="block min-w-0 flex-1">
          <span
            className={cn(
              'block text-(length:--type-body-size) leading-[22px] font-semibold',
              item.done && 'text-ink-muted',
            )}
          >
            {item.name}
          </span>
          {(context ||
            item.notes ||
            late ||
            (item.prepDayBefore && !hidePrepBadge)) && (
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-(length:--type-caption-size) leading-(--type-caption-line) font-medium text-ink-muted">
              {context && <span>{context}</span>}
              {item.notes && <span>{item.notes}</span>}
              {item.prepDayBefore && !hidePrepBadge && (
                <Badge variant="prep" icon={Clock}>
                  {t('item.prepDayBefore')}
                </Badge>
              )}
              {late && (
                <span className="inline-flex items-center gap-1 font-semibold text-warn">
                  <AlarmClock className="size-4" aria-hidden="true" />
                  {t('item.late')}
                </span>
              )}
            </span>
          )}
        </span>
        {quantity && (
          <span
            className={cn(
              'font-display text-[18px] leading-6 font-[650] whitespace-nowrap tabular-nums',
              item.done && 'text-ink-muted',
            )}
          >
            {quantity}
          </span>
        )}
      </button>
    {alert}
    </>
  )
}
