import { useState, useId, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, CircleCheck, CircleX, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { AppDialog } from '@/components/ui/AppDialog'
import { PhotoViewer } from '@/components/tickets/PhotoViewer'
import { TicketThumb } from '@/components/tickets/TicketThumb'
import { SafeForm } from '@/components/form/SafeForm'
import { useCustomer, useCustomerOrders, useCustomerTickets } from '@/data/hooks'
import { updateCustomer } from '@/data/repo/customers'
import { markTicketPaid, markTicketUnpaid } from '@/data/repo/tickets'
import { dateLocale, dayToDisplayDate } from '@/lib/dates'
import type { Customer, Order, Ticket } from '@shared/types'
import { formatMoney } from '@shared/format'
import { madridDay } from '@shared/progress'

type Locale = 'ca' | 'es'

/** Pickup instant in Europe/Madrid, e.g. "jue 17/12, 10:41". */
function formatPickup(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'es' ? 'es-ES' : 'ca-ES', {
    timeZone: 'Europe/Madrid',
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso))
}

const RECENT = 5

const sumCents = (tickets: Ticket[]): number =>
  tickets.reduce((sum, t) => sum + t.amountCents, 0)

/** Madrid day of a UTC instant, formatted for people ("3 nov 2026"). */
function formatDay(utcIso: string, language: string): string {
  return format(dayToDisplayDate(madridDay(utcIso)), 'd MMM yyyy', {
    locale: dateLocale(language),
  })
}

/** Customer file: contact fields (saved explicitly), orders and tickets. */
export default function CustomerPage() {
  const { t, i18n } = useTranslation('customers')
  const { id = '' } = useParams()
  const customer = useCustomer(id)
  const orders = useCustomerOrders(id)
  const tickets = useCustomerTickets(id)
  const locale: Locale = i18n.language === 'es' ? 'es' : 'ca'

  // undefined = loading; null = unknown, deleted or merged customer.
  if (customer === undefined || (customer && customer.id !== id)) {
    return <p className="text-ink-muted">{t('loading')}</p>
  }
  if (customer === null) {
    return (
      <section className="flex flex-col items-start gap-3">
        <p className="text-ink-muted">{t('notFound')}</p>
        <Link to="/customers" className="font-semibold text-brand-strong">
          {t('back')}
        </Link>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-6">
      <Link
        to="/customers"
        className="inline-flex min-h-(--touch-min) items-center gap-2 self-start font-semibold text-brand-strong"
      >
        <ArrowLeft className="size-5" aria-hidden="true" />
        {t('back')}
      </Link>

      <h2 className="font-display text-(length:--type-title-size) leading-(--type-title-line) font-[650]">
        {customer.name}
      </h2>

      {/* Keyed by customer so the drafts start from the stored values once per customer. */}
      <ContactForm key={customer.id} customer={customer} />

      <OrdersBlock orders={orders} locale={locale} customerId={customer.id} />
      <TicketsBlock tickets={tickets} locale={locale} customerId={customer.id} />
    </section>
  )
}

const H3 = 'font-display text-(length:--type-heading-size) font-[650]'

function OrdersBlock({
  orders,
  locale,
  customerId,
}: {
  orders: Order[] | undefined
  locale: Locale
  customerId: string
}) {
  const { t } = useTranslation('customers')
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const pending = (orders ?? [])
    .filter((o) => o.status === 'pending')
    .sort((a, b) => a.pickupAt.localeCompare(b.pickupAt))
  // `orders` come newest pickup first.
  const delivered = (orders ?? []).filter((o) => o.status === 'delivered').slice(0, RECENT)

  return (
    <section className="flex flex-col gap-3">
      <h3 className={H3}>{t('pendingOrders')}</h3>
      {orders === undefined ? null : pending.length === 0 ? (
        <p className="text-ink-muted">{t('noPendingOrders')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pending.map((order) => (
            <li key={order.id}>
              <OrderRow order={order} locale={locale} />
            </li>
          ))}
        </ul>
      )}
      <div>
        <Button aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
          {open ? t('hideDelivered') : t('showDelivered')}
        </Button>
      </div>
      {open && (
        <div id={panelId} className="flex flex-col gap-3">
          {delivered.length === 0 ? (
            <p className="text-ink-muted">{t('noDelivered')}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {delivered.map((order) => (
                <li key={order.id}>
                  <OrderRow order={order} locale={locale} />
                </li>
              ))}
            </ul>
          )}
          <Link
            to={`/archive?customer=${encodeURIComponent(customerId)}`}
            className="inline-flex min-h-(--touch-min) items-center self-start font-semibold text-brand-strong"
          >
            {t('explore')}
          </Link>
        </div>
      )}
    </section>
  )
}

function TicketsBlock({
  tickets,
  locale,
  customerId,
}: {
  tickets: Ticket[] | undefined
  locale: Locale
  customerId: string
}) {
  const { t } = useTranslation('customers')
  const [open, setOpen] = useState(false)
  const [viewing, setViewing] = useState<string | null>(null)
  const [returning, setReturning] = useState<Ticket | null>(null)
  const panelId = useId()
  const pending = (tickets ?? []).filter((x) => !x.paid)
  const paidAll = (tickets ?? []).filter((x) => x.paid)
  const paid = [...paidAll]
    .sort((a, b) => (b.paidAt ?? '').localeCompare(a.paidAt ?? ''))
    .slice(0, RECENT)

  async function confirmReturn() {
    if (!returning) return
    const id = returning.id
    setReturning(null)
    await markTicketUnpaid(id)
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className={H3}>{t('pendingTickets')}</h3>
        {tickets ? (
          <span className="font-semibold tabular-nums">
            {t('pendingTotal', { amount: formatMoney(sumCents(pending), locale) })}
          </span>
        ) : null}
      </div>
      {tickets === undefined ? null : pending.length === 0 ? (
        <p className="text-ink-muted">{t('noPendingTickets')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pending.map((ticket) => (
            <li key={ticket.id}>
              <TicketRow
                ticket={ticket}
                locale={locale}
                onOpenPhoto={setViewing}
                action={
                  <Button onClick={() => void markTicketPaid(ticket.id)}>{t('markPaid')}</Button>
                }
              />
            </li>
          ))}
        </ul>
      )}
      <div>
        <Button aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
          {open ? t('hidePaid') : t('showPaid')}
        </Button>
      </div>
      {open && (
        <div id={panelId} className="flex flex-col gap-3">
          {paidAll.length > 0 && (
            <span data-testid="paid-total" className="font-semibold tabular-nums">
              {t('paidTotal', { amount: formatMoney(sumCents(paidAll), locale) })}
            </span>
          )}
          {paid.length === 0 ? (
            <p className="text-ink-muted">{t('noPaidTickets')}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {paid.map((ticket) => (
                <li key={ticket.id}>
                  <TicketRow
                    ticket={ticket}
                    locale={locale}
                    onOpenPhoto={setViewing}
                    action={<Button onClick={() => setReturning(ticket)}>{t('backToPending')}</Button>}
                  />
                </li>
              ))}
            </ul>
          )}
          <Link
            to={`/tickets?view=paid&customer=${encodeURIComponent(customerId)}`}
            className="inline-flex min-h-(--touch-min) items-center self-start font-semibold text-brand-strong"
          >
            {t('explore')}
          </Link>
        </div>
      )}

      <AppDialog
        open={returning !== null}
        title={t('backTitle')}
        onClose={() => setReturning(null)}
        footer={
          <>
            <Button onClick={() => setReturning(null)}>{t('cancel')}</Button>
            <Button variant="primary" onClick={() => void confirmReturn()}>
              {t('backConfirm')}
            </Button>
          </>
        }
      >
        {returning && (
          <p>{t('backBody', { amount: formatMoney(returning.amountCents, locale) })}</p>
        )}
      </AppDialog>

      {viewing && <PhotoViewer ticketId={viewing} onClose={() => setViewing(null)} />}
    </section>
  )
}

function ContactForm({ customer }: { customer: Customer }) {
  const { t } = useTranslation('customers')
  const phoneId = useId()
  const notesId = useId()
  const [phone, setPhone] = useState(customer.phone ?? '')
  const [notes, setNotes] = useState(customer.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(false)

  const dirty =
    phone.trim() !== (customer.phone ?? '') || notes.trim() !== (customer.notes ?? '')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(false)
    try {
      await updateCustomer(customer.id, { phone, notes })
      setSaved(true)
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeForm onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor={phoneId} className="font-semibold text-(length:--type-label-size)">
          {t('phone')}
        </label>
        <input
          id={phoneId}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value)
            setSaved(false)
          }}
          className="min-h-(--touch-min) rounded-sm border border-line-strong bg-surface-raised px-3 text-(length:--type-body-size) text-ink tabular-nums"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={notesId} className="font-semibold text-(length:--type-label-size)">
          {t('notes')}
        </label>
        <textarea
          id={notesId}
          rows={3}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value)
            setSaved(false)
          }}
          className="rounded-sm border border-line-strong bg-surface-raised px-3 py-2 text-(length:--type-body-size) text-ink"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" size="lg" disabled={!dirty || saving}>
          {t('save')}
        </Button>
        {saved && !dirty ? (
          <span role="status" className="text-ink-muted">
            {t('saved')}
          </span>
        ) : null}
        {error ? (
          <span role="alert" className="text-danger">
            {t('saveError')}
          </span>
        ) : null}
      </div>
    </SafeForm>
  )
}

function OrderRow({ order, locale }: { order: Order; locale: Locale }) {
  const { t } = useTranslation('customers')
  const delivered = order.status === 'delivered'
  const cancelled = order.status === 'cancelled'
  const Icon = delivered ? CircleCheck : cancelled ? CircleX : Clock
  return (
    <Link
      to={`/orders/${order.id}`}
      className="flex min-h-(--touch-min) items-center justify-between gap-3 rounded-md border border-line bg-surface-raised px-4 py-2 text-ink"
    >
      <span className="font-semibold tabular-nums">{formatPickup(order.pickupAt, locale)}</span>
      <Badge variant={delivered ? 'ok' : 'neutral'} icon={Icon}>
        {t(`orderStatus.${order.status}`)}
      </Badge>
    </Link>
  )
}

function TicketRow({
  ticket,
  locale,
  onOpenPhoto,
  action,
}: {
  ticket: Ticket
  locale: Locale
  onOpenPhoto: (ticketId: string) => void
  action: ReactNode
}) {
  const { t, i18n } = useTranslation('customers')
  return (
    <div className="flex flex-col gap-2 rounded-md border border-line bg-surface-raised px-4 py-3">
      <div className="flex items-center gap-3">
        <TicketThumb ticket={ticket} onOpen={() => onOpenPhoto(ticket.id)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="font-semibold tabular-nums">{formatMoney(ticket.amountCents, locale)}</span>
          <span className="text-(length:--type-caption-size) text-ink-muted">
            {t('ticketDate', { date: formatDay(ticket.created, i18n.language) })}
            {ticket.paid && ticket.paidAt
              ? ` · ${t('paidDate', { date: formatDay(ticket.paidAt, i18n.language) })}`
              : ''}
          </span>
          {ticket.notes ? (
            <span className="truncate text-(length:--type-caption-size) text-ink-muted">
              {ticket.notes}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex justify-end">{action}</div>
    </div>
  )
}
