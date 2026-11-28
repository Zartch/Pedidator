import { useTranslation } from 'react-i18next'
import { madridDay } from '@shared/progress'
import { formatMoney } from '@shared/format'
import type { TicketGroup as TicketGroupData } from '@/data/hooks'
import { TicketThumb } from './TicketThumb'
import { Button } from '@/components/ui/Button'

type Locale = 'ca' | 'es'

type Props = {
  group: TicketGroupData
  locale: Locale
  onMarkPaid: (ticketId: string) => void
  onOpenPhoto: (ticketId: string) => void
}

function shortDate(utcIso: string): string {
  const [, m, d] = madridDay(utcIso).split('-')
  return `${d}/${m}`
}

export function TicketGroup({ group, locale, onMarkPaid, onOpenPhoto }: Props) {
  const { t } = useTranslation('tickets')
  const name = group.customer?.name ?? t('unknownCustomer')
  const tickets = [...group.tickets].sort((a, b) => a.created.localeCompare(b.created))

  return (
    <section className="flex flex-col gap-1 rounded-lg border border-line bg-surface-raised p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="min-w-0 truncate text-(length:--type-heading-size) leading-(--type-heading-line) font-semibold">
          {name}
        </h2>
        <span className="font-display text-[18px] leading-6 font-[650] tabular-nums">
          {formatMoney(group.totalCents, locale)}
        </span>
      </div>
      {tickets.map((ticket) => (
        <div key={ticket.id} className="flex min-h-16 items-center gap-3 border-t border-line py-2">
          <TicketThumb ticket={ticket} onOpen={() => onOpenPhoto(ticket.id)} />
          <div className="min-w-0 flex-1">
            <div className="font-semibold tabular-nums">
              {formatMoney(ticket.amountCents, locale)}
            </div>
            <div className="truncate text-(length:--type-label-size) text-ink-muted">
              {[shortDate(ticket.created), ticket.notes].filter(Boolean).join(' · ')}
            </div>
          </div>
          <Button
            className="px-3"
            aria-label={`${t('markPaid')}: ${name} ${formatMoney(ticket.amountCents, locale)}`}
            onClick={() => onMarkPaid(ticket.id)}
          >
            {t('markPaidShort')}
          </Button>
        </div>
      ))}
    </section>
  )
}
