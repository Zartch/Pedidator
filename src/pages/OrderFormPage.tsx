import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Ban } from 'lucide-react'
import { madridDay } from '@shared/progress'
import type { OrderItem } from '@shared/types'
import { useOrderDetail, type DayOrder } from '@/data/hooks'
import { getOrCreateCustomerByName } from '@/data/repo/customers'
import type { ItemInput } from '@/data/repo/orderItems'
import { cancelOrder, createOrder, saveOrder } from '@/data/repo/orders'
import { isDay, madridDateTimeToUtcIso, todayMadrid, utcIsoToMadridTime } from '@/lib/dates'
import { nameKey } from '@shared/nameKey'
import { SafeForm } from '@/components/form/SafeForm'
import { AppDialog } from '@/components/ui/AppDialog'
import { Button } from '@/components/ui/Button'
import { CustomerPicker } from '@/components/orders/CustomerPicker'
import {
  draftFromItem,
  draftToInput,
  toSaveItem,
  emptyDraft,
  type ItemDraft,
} from '@/components/orders/ItemEditorRow'
import { ItemsEditor } from '@/components/orders/ItemsEditor'
import { OrderTotal } from '@/components/orders/OrderTotal'

const DEFAULT_TIME = '09:00'
const FORM_ID = 'order-form'
const INPUT =
  'min-h-(--touch-min) w-full rounded-sm border-[1.5px] border-line-strong bg-surface-raised px-3 text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-strong'
const LABEL = 'text-(length:--type-label-size) font-medium'
const ERROR = 'text-(length:--type-caption-size) leading-(--type-caption-line) text-danger'

type FormError = 'customer' | 'datetime' | 'itemName' | 'none' | 'weight' | 'price' | 'save'

/** Create (`/orders/new?date=`) or edit (`/orders/:id`) an order with its items. */
export default function OrderFormPage() {
  const { t } = useTranslation('orderForm')
  const { id } = useParams()
  const [search] = useSearchParams()
  // undefined = loading, null = not found. useLiveQuery keeps the previous result
  // while the id changes, so a result for another order counts as loading.
  const detail = useOrderDetail(id)

  if (id) {
    if (detail === null) {
      return (
        <div className="flex flex-col items-start gap-3">
          <p className="text-ink-muted">{t('notFound')}</p>
          <Link to="/" className="font-semibold text-brand-strong">
            {t('backToDay')}
          </Link>
        </div>
      )
    }
    if (detail === undefined || detail.order.id !== id) {
      return <p className="text-ink-muted">{t('loading')}</p>
    }
  }
  const requested = search.get('date')
  const day = requested && isDay(requested) ? requested : todayMadrid()
  return (
    <OrderForm
      key={detail?.order.id ?? 'new'}
      detail={id ? (detail ?? undefined) : undefined}
      initialDay={day}
    />
  )
}

/** A row nobody touched: no id (not stored yet) and nothing typed or switched on. */
function isBlankDraft(d: ItemDraft): boolean {
  const empty = emptyDraft()
  return (
    !d.id &&
    d.name.trim() === '' &&
    d.notes.trim() === '' &&
    d.weightText.trim() === '' &&
    d.priceText.trim() === '' &&
    d.realText.trim() === '' &&
    d.quantity === empty.quantity &&
    !d.prepDayBefore &&
    !d.done
  )
}

function OrderForm({ detail, initialDay }: { detail?: DayOrder; initialDay: string }) {
  const { t } = useTranslation('orderForm')
  const navigate = useNavigate()
  const order = detail?.order
  const [customerText, setCustomerText] = useState(detail?.customer?.name ?? '')
  const [day, setDay] = useState(order ? madridDay(order.pickupAt) : initialDay)
  const [time, setTime] = useState(order ? utcIsoToMadridTime(order.pickupAt) : DEFAULT_TIME)
  const [important, setImportant] = useState(order?.important ?? false)
  const [notes, setNotes] = useState(order?.notes ?? '')
  const [drafts, setDrafts] = useState<ItemDraft[]>(() =>
    detail && detail.items.length > 0 ? detail.items.map(draftFromItem) : [emptyDraft()],
  )
  // How each stored item looked when the form opened, to save only what the user changes.
  const [originals] = useState(
    () => new Map((detail?.items ?? []).map((i) => [i.id, draftFromItem(i)])),
  )
  const [error, setError] = useState<FormError | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)

  const back = (target: string) =>
    navigate(`/day/${isDay(target) ? target : todayMadrid()}`)

  async function save() {
    // Untouched new rows are ignored; anything else without a name is an error.
    const used = drafts.filter((d) => !isBlankDraft(d))
    const unnamed = used.some((d) => d.name.trim() === '')
    const named = used.filter((d) => d.name.trim() !== '')
    const converted = named.map((d) => toSaveItem(d, d.id ? originals.get(d.id) : undefined))
    let failed: 'weight' | 'price' | null = null
    for (const r of converted) {
      if ('error' in r) {
        failed = r.error
        break
      }
    }
    const next: FormError | null = !nameKey(customerText)
      ? 'customer'
      : !isDay(day) || !time
        ? 'datetime'
        : unnamed
          ? 'itemName'
          : failed ?? (named.length === 0 ? 'none' : null)
    setError(next)
    if (next) return
    const items = converted.flatMap((r) => (r.ok ? [r.item] : []))
    setSaving(true)
    try {
      const customer = await getOrCreateCustomerByName(customerText)
      const fields = {
        customer: customer.id,
        pickupAt: madridDateTimeToUtcIso(day, time),
        important,
        notes,
      }
      if (order) await saveOrder(order.id, fields, items)
      // A new order has no stored items: every item is complete.
      else await createOrder(fields, items as ItemInput[])
      back(day)
    } catch {
      setError('save')
      setSaving(false)
    }
  }

  async function confirmCancelOrder() {
    if (!order) return
    setSaving(true)
    try {
      await cancelOrder(order.id)
      back(madridDay(order.pickupAt))
    } catch {
      setConfirmCancel(false)
      setError('save')
      setSaving(false)
    }
  }

  // Live total from what is typed (items that do not validate yet are left out).
  const priced = drafts.flatMap((d) => {
    const r = draftToInput(d)
    return r.ok && d.name.trim() !== '' ? [{ ...r.item, deleted: false } as unknown as OrderItem] : []
  })

  const errorText: Record<FormError, string> = {
    customer: t('customer.error'),
    datetime: t('dateTimeError'),
    itemName: t('items.errorName'),
    none: t('items.errorNone'),
    weight: t('items.errorWeight'),
    price: t('items.errorPrice'),
    save: t('actions.errorSave'),
  }

  return (
    <SafeForm
      id={FORM_ID}
      className="flex flex-1 flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        void save()
      }}
    >
      <h2 className="font-display text-(length:--type-title-size) leading-(--type-title-line) font-[650]">
        {order ? t('titleEdit') : t('titleNew')}
      </h2>

      <div className="grid gap-6 wide:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <section aria-label={t('whoWhen')} className="flex flex-col gap-4 wide:self-start">
          <CustomerPicker
            value={customerText}
            onChange={setCustomerText}
            error={error === 'customer'}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <label htmlFor="order-date" className={LABEL}>
                {t('date')}
              </label>
              <input
                id="order-date"
                type="date"
                className={INPUT}
                value={day}
                aria-invalid={error === 'datetime' && !isDay(day) ? true : undefined}
                onChange={(e) => setDay(e.target.value)}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <label htmlFor="order-time" className={LABEL}>
                {t('time')}
              </label>
              <input
                id="order-time"
                type="time"
                className={`${INPUT} tabular-nums`}
                value={time}
                aria-invalid={error === 'datetime' && !time ? true : undefined}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span id="order-priority" className={LABEL}>
              {t('priority.label')}
            </span>
            <div
              role="group"
              aria-labelledby="order-priority"
              className="inline-flex gap-[3px] self-start rounded-md border-[1.5px] border-line-strong bg-surface-raised p-[3px]"
            >
              {([false, true] as const).map((value) => (
                <button
                  key={String(value)}
                  type="button"
                  aria-pressed={important === value}
                  onClick={() => setImportant(value)}
                  className="min-h-[39px] min-w-11 cursor-pointer rounded-sm border-0 bg-transparent px-3 font-semibold text-ink-muted aria-pressed:bg-brand-soft aria-pressed:text-brand-strong aria-pressed:shadow-[inset_0_0_0_1.5px_var(--brand-strong)]"
                >
                  {value ? t('priority.important') : t('priority.normal')}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="order-notes" className={LABEL}>
              {t('notes')}
            </label>
            <textarea
              id="order-notes"
              rows={2}
              className={`${INPUT} py-2`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          {order && (
            <Button
              variant="danger"
              className="self-start"
              disabled={saving}
              onClick={() => setConfirmCancel(true)}
            >
              <Ban className="size-5" aria-hidden="true" />
              {t('actions.cancelOrder')}
            </Button>
          )}
        </section>

        <section aria-labelledby="order-items-title" className="flex min-w-0 flex-col gap-3">
          <h3
            id="order-items-title"
            className="font-display text-(length:--type-heading-size) leading-(--type-heading-line) font-[650]"
          >
            {t('items.title')}
          </h3>
          <ItemsEditor drafts={drafts} onChange={setDrafts} />
          <OrderTotal items={priced} />
        </section>
      </div>

      <div className="sticky bottom-[calc(var(--bar-height)+env(safe-area-inset-bottom))] tablet:bottom-0 -mx-4 mt-auto flex flex-col gap-2 border-t border-line bg-surface px-4 py-3 tablet:-mx-6 tablet:px-6">
        {error && (
          <p role="alert" className={ERROR}>
            {errorText[error]}
          </p>
        )}
        <div className="flex gap-2">
          <Button size="lg" disabled={saving} onClick={() => back(day)}>
            {t('actions.discard')}
          </Button>
          <Button variant="primary" size="lg" type="submit" className="flex-1" disabled={saving}>
            {saving ? t('actions.saving') : t('actions.save')}
          </Button>
        </div>
      </div>

      {confirmCancel && (
        <AppDialog
          open
          title={t('cancelDialog.title')}
          onClose={() => setConfirmCancel(false)}
          footer={
            <>
              <Button disabled={saving} onClick={() => setConfirmCancel(false)}>
                {t('cancelDialog.back')}
              </Button>
              <Button variant="danger" disabled={saving} onClick={() => void confirmCancelOrder()}>
                {t('cancelDialog.confirm')}
              </Button>
            </>
          }
        >
          <p>{t('cancelDialog.text')}</p>
        </AppDialog>
      )}
    </SafeForm>
  )
}
