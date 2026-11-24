import { useState, useId, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CircleCheck, CircleX, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SafeForm } from '@/components/form/SafeForm'
import { useCustomer, useCustomerOrders, useCustomerTickets } from '@/data/hooks'
import { updateCustomer } from '@/data/repo/customers'
import type { Customer, Order, Ticket } from '@shared/types'
import { formatMoney } from '@shared/format'

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

function unpaidTotal(tickets: Ticket[]): number {
  return tickets.filter((t) => !t.paid).reduce((sum, t) => sum + t.amountCents, 0)
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

      <section className="flex flex-col gap-3">
        <h3 className="font-display text-(length:--type-heading-size) font-[650]">{t('orders')}</h3>
        {orders === undefined ? null : orders.length === 0 ? (
          <p className="text-ink-muted">{t('noOrders')}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {orders.map((order) => (
              <li key={order.id}>
                <OrderRow order={order} locale={locale} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-(length:--type-heading-size) font-[650]">{t('tickets')}</h3>
          {tickets ? (
            <span className="font-semibold tabular-nums">
              {t('pendingTotal', { amount: formatMoney(unpaidTotal(tickets), locale) })}
            </span>
          ) : null}
        </div>
        {tickets === undefined ? null : tickets.length === 0 ? (
          <p className="text-ink-muted">{t('noTickets')}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <TicketRow ticket={ticket} locale={locale} />
              </li>
            ))}
          </ul>
        )}
      </section>
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

function TicketRow({ ticket, locale }: { ticket: Ticket; locale: Locale }) {
  const { t } = useTranslation('customers')
  return (
    <div className="flex min-h-(--touch-min) items-center justify-between gap-3 rounded-md border border-line bg-surface-raised px-4 py-2">
      <div className="flex min-w-0 flex-col">
        <span className="font-semibold tabular-nums">{formatMoney(ticket.amountCents, locale)}</span>
        {ticket.notes ? (
          <span className="truncate text-(length:--type-caption-size) text-ink-muted">
            {ticket.notes}
          </span>
        ) : null}
      </div>
      {ticket.paid ? (
        <Badge variant="ok" icon={CircleCheck}>
          {t('paid')}
        </Badge>
      ) : (
        <Badge variant="warn" icon={Clock}>
          {t('unpaid')}
        </Badge>
      )}
    </div>
  )
}
