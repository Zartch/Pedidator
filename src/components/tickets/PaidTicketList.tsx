import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { formatMoney } from '@shared/format'
import { madridDay } from '@shared/progress'
import type { Ticket } from '@shared/types'
import { usePaidTickets, type PaidTicketRow } from '@/data/hooks'
import { getBlob } from '@/data/repo/blobs'
import { markTicketUnpaid } from '@/data/repo/tickets'
import { dateLocale, dayToDisplayDate } from '@/lib/dates'
import { AppDialog } from '@/components/ui/AppDialog'
import { Button } from '@/components/ui/Button'
import { PhotoViewer } from './PhotoViewer'

type Locale = 'ca' | 'es'

const FIELD =
  'min-h-(--touch-min) w-full rounded-sm border-[1.5px] border-line-strong bg-surface-raised px-3 text-(length:--type-body-size) leading-(--type-body-line) text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-strong'
const LABEL = 'flex flex-col gap-1 text-(length:--type-label-size) font-semibold text-ink-muted'

/** Madrid day "YYYY-MM-DD" of a UTC instant, formatted for people ("3 nov 2026"). */
function formatDay(utcIso: string, language: string): string {
  return format(dayToDisplayDate(madridDay(utcIso)), 'd MMM yyyy', {
    locale: dateLocale(language),
  })
}

/**
 * Paid tickets with a search by customer, a payment-date range (Madrid days),
 * the total of what is shown, and "back to pending" with confirmation.
 */
export function PaidTicketList() {
  const { t, i18n } = useTranslation('tickets')
  const locale: Locale = i18n.language === 'es' ? 'es' : 'ca'
  const [text, setText] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [viewing, setViewing] = useState<string | null>(null)
  const [returning, setReturning] = useState<PaidTicketRow | null>(null)

  const rows = usePaidTickets({
    text: text.trim() || undefined,
    from: from || undefined,
    to: to || undefined,
  })
  const filtered = Boolean(text.trim() || from || to)
  const total = (rows ?? []).reduce((sum, r) => sum + r.ticket.amountCents, 0)

  async function confirmReturn() {
    if (!returning) return
    const id = returning.ticket.id
    setReturning(null)
    await markTicketUnpaid(id)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <label className={LABEL}>
          {t('paid.search.label')}
          <input
            type="search"
            className={FIELD}
            placeholder={t('paid.search.placeholder')}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className={LABEL}>
            {t('paid.range.from')}
            <input type="date" className={FIELD} value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className={LABEL}>
            {t('paid.range.to')}
            <input type="date" className={FIELD} value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        {(from || to) && (
          <div>
            <Button
              variant="ghost"
              onClick={() => {
                setFrom('')
                setTo('')
              }}
            >
              {t('paid.range.clear')}
            </Button>
          </div>
        )}
      </div>

      {rows && rows.length > 0 && (
        <div className="flex items-baseline justify-between gap-3 rounded-lg border border-brand-strong bg-brand-soft p-4">
          <span className="font-semibold">{t('paid.total')}</span>
          <span
            data-testid="paid-total"
            className="font-display text-[24px] leading-7 font-bold tabular-nums"
          >
            {formatMoney(total, locale)}
          </span>
        </div>
      )}

      {rows && rows.length === 0 && (
        <p className="flex flex-1 items-center justify-center py-12 text-center text-ink-muted">
          {filtered ? t('paid.emptyFiltered') : t('paid.empty')}
        </p>
      )}

      {rows?.map(({ ticket, customer }) => {
        const name = customer?.name ?? t('paid.unknownCustomer')
        return (
          <section
            key={ticket.id}
            className="flex flex-col gap-2 rounded-lg border border-line bg-surface-raised p-4"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="min-w-0 truncate text-(length:--type-heading-size) leading-(--type-heading-line) font-semibold">
                {name}
              </h3>
              <span className="font-display text-[18px] leading-6 font-[650] tabular-nums">
                {formatMoney(ticket.amountCents, locale)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <PaidThumb ticket={ticket} label={t('photo.open')} onOpen={() => setViewing(ticket.id)} />
              <div className="min-w-0 flex-1 text-(length:--type-label-size) text-ink-muted">
                <div>{t('paid.ticketDate', { date: formatDay(ticket.created, i18n.language) })}</div>
                {ticket.paidAt && (
                  <div>{t('paid.paidDate', { date: formatDay(ticket.paidAt, i18n.language) })}</div>
                )}
                {ticket.notes && <div className="truncate">{ticket.notes}</div>}
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setReturning({ ticket, customer })}>{t('paid.back')}</Button>
            </div>
          </section>
        )
      })}

      <AppDialog
        open={returning !== null}
        title={t('paid.backTitle')}
        onClose={() => setReturning(null)}
        footer={
          <>
            <Button onClick={() => setReturning(null)}>{t('paid.cancel')}</Button>
            <Button variant="primary" onClick={() => void confirmReturn()}>
              {t('paid.backConfirm')}
            </Button>
          </>
        }
      >
        {returning && (
          <p>
            {t('paid.backBody', {
              name: returning.customer?.name ?? t('paid.unknownCustomer'),
              amount: formatMoney(returning.ticket.amountCents, locale),
            })}
          </p>
        )}
      </AppDialog>

      {viewing && <PhotoViewer ticketId={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}

const THUMB =
  'flex size-12 flex-none items-center justify-center overflow-hidden rounded-md border border-line bg-surface-sunken'

/** Cached thumbnail when this device has it; otherwise a placeholder that still opens the viewer. */
function PaidThumb({ ticket, label, onOpen }: { ticket: Ticket; label: string; onOpen: () => void }) {
  const { t } = useTranslation('tickets')
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    void getBlob('tickets', ticket.id, 'thumb').then((blob) => {
      if (cancelled || !blob) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [ticket.id])

  if (!ticket.photo) {
    return (
      <div role="img" aria-label={t('photo.none')} className={`${THUMB} border-dashed border-line-strong text-center text-[11px] leading-[14px] font-semibold text-ink-muted`}>
        {t('photo.none')}
      </div>
    )
  }
  return (
    <button type="button" onClick={onOpen} aria-label={label} className={`${THUMB} cursor-pointer p-0 text-[11px] font-semibold text-ink-muted`}>
      {url ? <img src={url} alt="" className="size-full object-cover" /> : t('photo.placeholder')}
    </button>
  )
}
