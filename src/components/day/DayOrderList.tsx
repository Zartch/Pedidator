import { useTranslation } from 'react-i18next'
import type { DayOrder } from '@/data/hooks'
import { OrderCard } from './OrderCard'

type Props = {
  /** Pending orders of the day, by pickup time. */
  orders: DayOrder[]
  today: string
  /** Id of the order to highlight as the next pickup (only on today). */
  nextId?: string
}

export function DayOrderList({ orders, today, nextId }: Props) {
  const { t } = useTranslation('day')
  if (orders.length === 0) {
    return (
      <p className="py-6 text-center text-ink-muted">{t('orders.empty')}</p>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {orders.map((data) => (
        <OrderCard
          key={data.order.id}
          data={data}
          today={today}
          isNext={data.order.id === nextId}
        />
      ))}
    </div>
  )
}
