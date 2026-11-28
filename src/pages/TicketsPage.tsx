import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { formatMoney } from '@shared/format'
import { usePendingTickets } from '@/data/hooks'
import { markTicketPaid } from '@/data/repo/tickets'
import { Button } from '@/components/ui/Button'
import { TicketGroup } from '@/components/tickets/TicketGroup'
import { TicketDialog } from '@/components/tickets/TicketDialog'
import { PaidTicketList } from '@/components/tickets/PaidTicketList'
import { PhotoViewer } from '@/components/tickets/PhotoViewer'

const TAB =
  'min-h-(--touch-min) flex-1 rounded-md border-[1.5px] px-4 font-semibold text-(length:--type-body-size) leading-(--type-body-line) cursor-pointer focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-strong'

export default function TicketsPage() {
  const { t, i18n } = useTranslation('tickets')
  const locale = i18n.language === 'es' ? 'es' : 'ca'
  const [params, setParams] = useSearchParams()
  const paidView = params.get('view') === 'paid'
  const groups = usePendingTickets()
  const [creating, setCreating] = useState(false)
  const [viewing, setViewing] = useState<string | null>(null)

  const sorted = groups
    ? [...groups].sort((a, b) =>
        (a.customer?.name ?? '').localeCompare(b.customer?.name ?? '', locale),
      )
    : []
  const total = sorted.reduce((sum, g) => sum + g.totalCents, 0)

  function selectView(paid: boolean) {
    setParams(paid ? { view: 'paid' } : {})
  }

  const tabs = (
    <div role="tablist" aria-label={t('tabs.label')} className="flex gap-2">
      <button
        type="button"
        role="tab"
        id="tickets-tab-pending"
        aria-selected={!paidView}
        aria-controls="tickets-panel"
        className={`${TAB} ${!paidView ? 'border-brand-strong bg-brand-soft text-brand-strong' : 'border-line-strong bg-surface-raised text-ink'}`}
        onClick={() => selectView(false)}
      >
        {t('tabs.pending')}
      </button>
      <button
        type="button"
        role="tab"
        id="tickets-tab-paid"
        aria-selected={paidView}
        aria-controls="tickets-panel"
        className={`${TAB} ${paidView ? 'border-brand-strong bg-brand-soft text-brand-strong' : 'border-line-strong bg-surface-raised text-ink'}`}
        onClick={() => selectView(true)}
      >
        {t('tabs.paid')}
      </button>
    </div>
  )

  if (paidView) {
    return (
      <section className="flex flex-1 flex-col gap-4">
        <h2 className="font-display text-(length:--type-title-size) leading-(--type-title-line) font-[650]">
          {t('titlePaid')}
        </h2>
        {tabs}
        <div id="tickets-panel" role="tabpanel" aria-labelledby="tickets-tab-paid">
          <PaidTicketList />
        </div>
      </section>
    )
  }

  return (
    <section className="flex flex-1 flex-col gap-4">
      <h2 className="font-display text-(length:--type-title-size) leading-(--type-title-line) font-[650]">
        {t('title')}
      </h2>
      {tabs}

      <div id="tickets-panel" role="tabpanel" aria-labelledby="tickets-tab-pending" className="flex flex-1 flex-col gap-4">
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
      </div>

      {creating && <TicketDialog onClose={() => setCreating(false)} />}
      {viewing && <PhotoViewer ticketId={viewing} onClose={() => setViewing(null)} />}
    </section>
  )
}
