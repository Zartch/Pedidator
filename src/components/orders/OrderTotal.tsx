import { useTranslation } from 'react-i18next'
import { formatMoney } from '@shared/format'
import { orderTotal } from '@shared/pricing'
import type { OrderItem } from '@shared/types'

/** Order total. Renders nothing unless some item has a price. "≈" when any line is estimated. */
export function OrderTotal({ items }: { items: OrderItem[] }) {
  const { t, i18n } = useTranslation('orderForm')
  const total = orderTotal(items)
  if (!total) return null
  const locale = i18n.language === 'es' ? 'es' : 'ca'
  const amount = formatMoney(total.cents, locale)
  return (
    <div
      data-testid="order-total"
      className="flex flex-wrap items-baseline justify-between gap-x-4 rounded-md border border-line bg-surface-raised px-4 py-3"
    >
      <span className="text-(length:--type-label-size) font-medium">{t('total.label')}</span>
      <span className="font-display text-(length:--type-title-size) font-[650] tabular-nums">
        {total.estimated ? t('total.estimated', { amount }) : amount}
      </span>
      {total.unpriced > 0 && (
        <span className="w-full text-(length:--type-caption-size) text-ink-muted">
          {t('total.unpriced', { count: total.unpriced })}
        </span>
      )}
    </div>
  )
}
