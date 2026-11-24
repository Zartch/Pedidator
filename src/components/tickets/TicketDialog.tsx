import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, Image as ImageIcon, Trash2 } from 'lucide-react'
import { parseMoney } from '@shared/format'
import { nameKey } from '@shared/nameKey'
import { useCustomerSuggestions } from '@/data/hooks'
import { getOrCreateCustomerByName } from '@/data/repo/customers'
import { putBlob } from '@/data/repo/blobs'
import { createTicket } from '@/data/repo/tickets'
import { preparePhoto } from '@/lib/photo'
import { AppDialog } from '@/components/ui/AppDialog'
import { Button } from '@/components/ui/Button'
import { SafeForm } from '@/components/form/SafeForm'

type Props = { onClose: () => void }

const FORM_ID = 'ticket-form'
const INPUT =
  'min-h-(--touch-min) w-full rounded-sm border-[1.5px] border-line-strong bg-surface-raised px-3 text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-strong'
const LABEL = 'text-(length:--type-label-size) font-medium'
const ERROR = 'text-(length:--type-caption-size) leading-(--type-caption-line) text-danger'

/** New-ticket dialog: customer (suggestions or new by name), amount, notes and optional photo. */
export function TicketDialog({ onClose }: Props) {
  const { t } = useTranslation('tickets')
  const [customerText, setCustomerText] = useState('')
  const [picked, setPicked] = useState(false)
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null)
  const [errors, setErrors] = useState<{ customer?: boolean; amount?: boolean; save?: boolean }>({})
  const [saving, setSaving] = useState(false)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const suggestions = useCustomerSuggestions(customerText.trim(), 5)
  const exact = suggestions?.some((c) => c.nameKey === nameKey(customerText))
  const showSuggestions = !picked && customerText.trim() !== '' && !exact && !!suggestions?.length
  const isNew = customerText.trim() !== '' && suggestions !== undefined && !exact

  // Object URLs are revoked when replaced, removed, or when the dialog closes.
  const urlRef = useRef<string | null>(null)
  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
  }, [])

  function choosePhoto(file: File | null) {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = file ? URL.createObjectURL(file) : null
    setPhoto(file && urlRef.current ? { file, url: urlRef.current } : null)
  }

  function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0]
    if (chosen) choosePhoto(chosen)
    event.target.value = ''
  }

  async function save() {
    const cents = parseMoney(amount)
    const nextErrors = {
      customer: !nameKey(customerText) || undefined,
      amount: cents === null || cents <= 0 || undefined,
    }
    setErrors(nextErrors)
    if (nextErrors.customer || nextErrors.amount || cents === null) return
    setSaving(true)
    try {
      const prepared = photo ? await preparePhoto(photo.file) : null
      const customer = await getOrCreateCustomerByName(customerText)
      const ticket = await createTicket({ customer: customer.id, amountCents: cents, notes })
      if (prepared) {
        await putBlob('tickets', ticket.id, 'photo', prepared.photo)
        await putBlob('tickets', ticket.id, 'thumb', prepared.thumb)
      }
      onClose()
    } catch {
      setErrors({ save: true })
      setSaving(false)
    }
  }

  return (
    <AppDialog
      open
      title={t('dialog.title')}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            {t('dialog.cancel')}
          </Button>
          <Button variant="primary" type="submit" form={FORM_ID} disabled={saving}>
            {saving ? t('dialog.saving') : t('dialog.save')}
          </Button>
        </>
      }
    >
      <SafeForm
        id={FORM_ID}
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="ticket-customer" className={LABEL}>
            {t('dialog.customer')}
          </label>
          <input
            id="ticket-customer"
            type="text"
            autoComplete="off"
            className={INPUT}
            value={customerText}
            aria-invalid={errors.customer ? true : undefined}
            onChange={(e) => {
              setCustomerText(e.target.value)
              setPicked(false)
            }}
          />
          {showSuggestions && (
            <ul className="flex flex-col overflow-hidden rounded-sm border border-line">
              {suggestions.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="min-h-(--touch-min) w-full cursor-pointer border-0 bg-surface-raised px-3 text-left text-ink"
                    onClick={() => {
                      setCustomerText(c.name)
                      setPicked(true)
                    }}
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {isNew ? (
            <span className="text-(length:--type-caption-size) text-ink-muted">
              {t('dialog.newCustomer', { name: customerText.trim() })}
            </span>
          ) : (
            <span className="text-(length:--type-caption-size) text-ink-muted">
              {t('dialog.customerHint')}
            </span>
          )}
          {errors.customer && <span className={ERROR}>{t('dialog.errorCustomer')}</span>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="ticket-amount" className={LABEL}>
            {t('dialog.amount')}
          </label>
          <div className="flex items-center rounded-sm border-[1.5px] border-line-strong bg-surface-raised focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-brand-strong">
            <input
              id="ticket-amount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              className="h-[45px] min-w-0 flex-1 border-0 bg-transparent px-3 text-right tabular-nums text-ink outline-0"
              value={amount}
              aria-invalid={errors.amount ? true : undefined}
              onChange={(e) => setAmount(e.target.value)}
            />
            <span className="pr-3 text-ink-muted">€</span>
          </div>
          {errors.amount && <span className={ERROR}>{t('dialog.errorAmount')}</span>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="ticket-notes" className={LABEL}>
            {t('dialog.notes')}
          </label>
          <textarea
            id="ticket-notes"
            rows={2}
            className={`${INPUT} py-2`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className={LABEL}>{t('dialog.photo')}</span>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            data-testid="ticket-camera"
            onChange={onFile}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="hidden"
            data-testid="ticket-gallery"
            onChange={onFile}
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => cameraRef.current?.click()}>
              <Camera className="size-5" aria-hidden="true" />
              {t('dialog.takePhoto')}
            </Button>
            <Button onClick={() => galleryRef.current?.click()}>
              <ImageIcon className="size-5" aria-hidden="true" />
              {t('dialog.chooseGallery')}
            </Button>
          </div>
          {photo && (
            <div className="flex items-center gap-3">
              <img
                src={photo.url}
                alt={t('dialog.preview')}
                className="size-20 rounded-md border border-line object-cover"
              />
              <Button variant="ghost" onClick={() => choosePhoto(null)}>
                <Trash2 className="size-5" aria-hidden="true" />
                {t('dialog.removePhoto')}
              </Button>
            </div>
          )}
        </div>
        {errors.save && (
          <p role="alert" className={ERROR}>
            {t('dialog.errorSave')}
          </p>
        )}
      </SafeForm>
    </AppDialog>
  )
}
