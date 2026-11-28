import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { parseMoney } from '@shared/format'
import { nameKey } from '@shared/nameKey'
import type { Measure, Product } from '@shared/types'
import { SafeForm } from '@/components/form/SafeForm'
import { centsToText } from '@/components/orders/ItemEditorRow'
import { PriceDisclosure } from '@/components/orders/PriceDisclosure'
import { AppDialog } from '@/components/ui/AppDialog'
import { Button } from '@/components/ui/Button'
import { useProduct } from '@/data/hooks'
import {
  createProduct,
  deleteProduct,
  findProductByName,
  updateProduct,
} from '@/data/repo/products'

const INPUT =
  'min-h-(--touch-min) w-full rounded-sm border-[1.5px] border-line-strong bg-surface-raised px-3 text-(length:--type-body-size) text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-strong'
const LABEL = 'text-(length:--type-label-size) font-medium'

/** Create (`/products/new`) or edit (`/products/:id`) a catalogue product. */
export default function ProductPage() {
  const { t } = useTranslation('products')
  const { id } = useParams()
  const product = useProduct(id)

  if (id === undefined) return <ProductForm key="new" product={null} />
  // undefined = loading; null = unknown or deleted product.
  if (product === undefined || (product && product.id !== id)) {
    return <p className="text-ink-muted">{t('loading')}</p>
  }
  if (product === null) {
    return (
      <section className="flex flex-col items-start gap-3">
        <p className="text-ink-muted">{t('notFound')}</p>
        <Link to="/products" className="font-semibold text-brand-strong">
          {t('back')}
        </Link>
      </section>
    )
  }
  return <ProductForm key={product.id} product={product} />
}

type FormError = 'name' | 'duplicate' | 'price' | 'save'

function ProductForm({ product }: { product: Product | null }) {
  const { t } = useTranslation('products')
  const navigate = useNavigate()
  const nameId = useId()
  const measureId = useId()
  const notesId = useId()
  const [name, setName] = useState(product?.name ?? '')
  const [measure, setMeasure] = useState<Measure>(product?.measure ?? 'unit')
  const [prep, setPrep] = useState(product?.prepDayBefore ?? false)
  const [priceText, setPriceText] = useState(
    product?.unitPriceCents == null ? '' : centsToText(product.unitPriceCents),
  )
  const [notes, setNotes] = useState(product?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<FormError | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!nameKey(name)) return setError('name')
    let unitPriceCents: number | null = null
    if (priceText.trim() !== '') {
      unitPriceCents = parseMoney(priceText)
      if (unitPriceCents === null) return setError('price')
    }
    setSaving(true)
    setError(null)
    try {
      const other = await findProductByName(name)
      if (other && other.id !== product?.id) {
        setError('duplicate')
        return
      }
      const fields = { name, measure, prepDayBefore: prep, unitPriceCents, notes }
      if (product) await updateProduct(product.id, fields)
      else await createProduct(fields)
      navigate('/products')
    } catch {
      setError('save')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!product) return
    setSaving(true)
    try {
      await deleteProduct(product.id)
      navigate('/products')
    } catch {
      setConfirmDelete(false)
      setError('save')
    } finally {
      setSaving(false)
    }
  }

  const nameError = error === 'name' || error === 'duplicate'

  return (
    <section className="flex flex-col gap-6">
      <Link
        to="/products"
        className="inline-flex min-h-(--touch-min) items-center gap-2 self-start font-semibold text-brand-strong"
      >
        <ArrowLeft className="size-5" aria-hidden="true" />
        {t('back')}
      </Link>

      <h2 className="font-display text-(length:--type-title-size) leading-(--type-title-line) font-[650]">
        {product ? product.name : t('newTitle')}
      </h2>

      <SafeForm onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor={nameId} className={LABEL}>
            {t('name')}
          </label>
          <input
            id={nameId}
            type="text"
            autoComplete="off"
            className={INPUT}
            value={name}
            aria-invalid={nameError ? true : undefined}
            onChange={(e) => {
              setName(e.target.value)
              setError(null)
            }}
          />
          {nameError && (
            <span role="alert" className="text-(length:--type-caption-size) text-danger">
              {error === 'duplicate' ? t('errorDuplicate') : t('errorName')}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <span className={LABEL} id={measureId}>
            {t('measure')}
          </span>
          <div
            role="group"
            aria-labelledby={measureId}
            className="inline-flex gap-[3px] self-start rounded-md border-[1.5px] border-line-strong bg-surface-raised p-[3px]"
          >
            {(['unit', 'weight'] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={measure === m}
                onClick={() => setMeasure(m)}
                className="min-h-[39px] min-w-11 cursor-pointer rounded-sm border-0 bg-transparent px-3 font-semibold text-ink-muted aria-pressed:bg-brand-soft aria-pressed:text-brand-strong aria-pressed:shadow-[inset_0_0_0_1.5px_var(--brand-strong)]"
              >
                {m === 'unit' ? t('units') : t('weight')}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={prep}
          onClick={() => setPrep((v) => !v)}
          className="group flex min-h-(--touch-min) cursor-pointer items-center gap-3 self-start border-0 bg-transparent p-0 text-left font-medium text-ink"
        >
          <span
            aria-hidden="true"
            className="relative h-8 w-[52px] flex-none rounded-full bg-surface-raised shadow-[inset_0_0_0_2px_var(--line-strong)] group-aria-checked:bg-prep group-aria-checked:shadow-none after:absolute after:top-1.5 after:left-1.5 after:size-5 after:rounded-full after:bg-line-strong after:transition-transform group-aria-checked:after:translate-x-5 group-aria-checked:after:bg-on-status motion-reduce:after:transition-none"
          />
          {t('prep')}
        </button>

        <PriceDisclosure
          measure={measure}
          priceText={priceText}
          realText=""
          realUnit="g"
          onPrice={(text) => {
            setPriceText(text)
            setError(null)
          }}
          onReal={() => {}}
          hideRealWeight
        />

        <div className="flex flex-col gap-1">
          <label htmlFor={notesId} className={LABEL}>
            {t('notes')}
          </label>
          <textarea
            id={notesId}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="rounded-sm border-[1.5px] border-line-strong bg-surface-raised px-3 py-2 text-(length:--type-body-size) text-ink"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="primary" size="lg" disabled={saving}>
            {t('save')}
          </Button>
          {product && (
            <Button
              variant="danger"
              size="lg"
              disabled={saving}
              onClick={() => setConfirmDelete(true)}
            >
              {t('delete')}
            </Button>
          )}
          {error === 'price' && (
            <span role="alert" className="text-danger">
              {t('errorPrice')}
            </span>
          )}
          {error === 'save' && (
            <span role="alert" className="text-danger">
              {t('saveError')}
            </span>
          )}
        </div>
      </SafeForm>

      {confirmDelete && (
        <AppDialog
          open
          title={t('deleteDialog.title')}
          onClose={() => setConfirmDelete(false)}
          footer={
            <>
              <Button disabled={saving} onClick={() => setConfirmDelete(false)}>
                {t('deleteDialog.back')}
              </Button>
              <Button variant="danger" disabled={saving} onClick={() => void handleDelete()}>
                {t('deleteDialog.confirm')}
              </Button>
            </>
          }
        >
          <p>{t('deleteDialog.text')}</p>
        </AppDialog>
      )}
    </section>
  )
}
