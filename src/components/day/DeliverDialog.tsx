import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { parseMoney } from '@shared/format'
import { orderTotal } from '@shared/pricing'
import { madridDay, orderProgress } from '@shared/progress'
import type { DayOrder } from '@/data/hooks'
import { deliverOrder, deliverOrderWithTicket } from '@/data/repo/orders'
import { utcIsoToMadridTime } from '@/lib/dates'
import { AppDialog } from '@/components/ui/AppDialog'
import { Button } from '@/components/ui/Button'
import { SafeForm } from '@/components/form/SafeForm'

type Props = { data: DayOrder; onClose: () => void }

const FORM_ID = 'deliver-form'
const INPUT =
  'min-h-(--touch-min) w-full rounded-sm border-[1.5px] border-line-strong bg-surface-raised px-3 text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-strong'
const LABEL = 'text-(length:--type-label-size) font-medium'
const ERROR =
  'text-(length:--type-caption-size) leading-(--type-caption-line) text-danger'

function centsToInput(cents: number): string {
  return `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, '0')}`
}

/**
 * Always asked before delivering. Delivers as is, or delivers and leaves the
 * amount owed as a pending ticket of the same customer.
 */
export function DeliverDialog({ data, onClose }: Props) {
  const { t } = useTranslation('day')
  const { order, items } = data
  const progress = orderProgress(items)
  const total = orderTotal(items)
  const [owing, setOwing] = useState(false)
  const [amount, setAmount] = useState(total ? centsToInput(total.cents) : '')
  const [notes, setNotes] = useState(() => {
    const [, month, day] = madridDay(order.pickupAt).split('-')
    return t('deliverDialog.defaultNotes', {
      date: `${day}/${month}`,
      time: utcIsoToMadridTime(order.pickupAt),
    })
  })
  const [amountError, setAmountError] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [busy, setBusy] = useState(false)

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setSaveError(false)
    try {
      await action()
      onClose()
    } catch {
      setSaveError(true)
      setBusy(false)
    }
  }

  function deliverWithTicket() {
    const cents = parseMoney(amount)
    if (cents === null || cents <= 0) {
      setAmountError(true)
      return
    }
    setAmountError(false)
    void run(() => deliverOrderWithTicket(order.id, { amountCents: cents, notes }))
  }

  return (
    <AppDialog
      open
      title={t('deliverDialog.title')}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            {t('deliverDialog.back')}
          </Button>
          {owing ? (
            <Button variant="primary" type="submit" form={FORM_ID} disabled={busy}>
              {t('deliverDialog.createTicket')}
            </Button>
          ) : (
            <>
              <Button onClick={() => setOwing(true)} disabled={busy}>
                {t('deliverDialog.owe')}
              </Button>
              <Button
                variant="primary"
                onClick={() => void run(() => deliverOrder(order.id))}
                disabled={busy}
              >
                {t('deliverDialog.deliver')}
              </Button>
            </>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {progress.prepared ? (
          <p>{t('deliverDialog.ready')}</p>
        ) : (
          <p>
            {t('deliverDialog.message', {
              done: progress.done,
              total: progress.total,
            })}
          </p>
        )}
        {owing && (
          <SafeForm
            id={FORM_ID}
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              deliverWithTicket()
            }}
          >
            <div className="flex flex-col gap-1">
              <label htmlFor="deliver-amount" className={LABEL}>
                {t('deliverDialog.amount')}
              </label>
              <input
                id="deliver-amount"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                className={INPUT}
                value={amount}
                aria-invalid={amountError ? true : undefined}
                onChange={(e) => setAmount(e.target.value)}
              />
              {amountError && (
                <p role="alert" className={ERROR}>
                  {t('deliverDialog.errorAmount')}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="deliver-notes" className={LABEL}>
                {t('deliverDialog.notes')}
              </label>
              <textarea
                id="deliver-notes"
                rows={2}
                className={`${INPUT} py-2`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </SafeForm>
        )}
        {saveError && (
          <p role="alert" className={ERROR}>
            {t('deliverDialog.errorSave')}
          </p>
        )}
      </div>
    </AppDialog>
  )
}
