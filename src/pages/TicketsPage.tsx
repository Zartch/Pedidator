import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { formatMoney } from '@shared/format'
import { usePendingTickets } from '@/data/hooks'
import { markTicketPaid } from '@/data/repo/tickets'
import { Button } from '@/components/ui/Button'
import { TicketGroup } from '@/components/tickets/TicketGroup'
import { TicketDialog } from '@/components/tickets/TicketDialog'
import { PhotoViewer } from '@/components/tickets/PhotoViewer'

export default function TicketsPage() {
  const { t, i18n } = useTranslation('tickets')
  const locale = i18n.language === 'es' ? 'es' : 'ca'
  const groups = usePendingTickets()
  const [creating, setCreating] = useState(false)
  const [viewing, setViewing] = useState<string | null>(null)

  const sorted = groups
    ? [...groups].sort((a, b) =>
        (a.customer?.name ?? '').localeCompare(b.customer?.name ?? '', locale),
      )
    : []
  const total = sorted.reduce((sum, g) => sum + g.totalCents, 0)

  return (
    <section className="flex flex-1 flex-col gap-4">
      <h2 className="font-display text-(length:--type-title-size) leading-(--type-title-line) font-[650]">
        {t('title')}
      </h2>

      {groups && sorted.length === 0 && (
        <p className="flex flex-1 items-center justify-center py-12 text-center text-ink-muted">
          {t('empty')}
        </p>
      )}

      {sorted.length > 0 && (
        <div className="flex items-baseline justify-between gap-3 rounded-lg border border-brand-strong bg-brand-soft p-4">
          <span className="font-semibold">{t('total')}</span>
          <span
            data-testid="grand-total"
            className="font-display text-[24px] leading-7 font-bold tabular-nums"
          >
            {formatMoney(total, locale)}
          </span>
        </div>
      )}

      {sorted.map((group) => (
        <TicketGroup
          key={group.customer?.id ?? group.tickets[0].customer}
          group={group}
          locale={locale}
          onMarkPaid={(id) => void markTicketPaid(id)}
          onOpenPhoto={setViewing}
        />
      ))}

      <div className="sticky bottom-0 -mx-4 mt-auto border-t border-line bg-surface px-4 py-3 tablet:-mx-6 tablet:px-6">
        <Button variant="primary" size="lg" block onClick={() => setCreating(true)}>
          <Plus className="size-5" aria-hidden="true" />
          {t('new')}
        </Button>
      </div>

      {creating && <TicketDialog onClose={() => setCreating(false)} />}
      {viewing && <PhotoViewer ticketId={viewing} onClose={() => setViewing(null)} />}
    </section>
  )
}
