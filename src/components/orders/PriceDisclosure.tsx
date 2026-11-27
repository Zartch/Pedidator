import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { parseMoney } from '@shared/format'
import type { Measure } from '@shared/types'
import { Button } from '@/components/ui/Button'
import { WeightField, type Unit } from './WeightField'

type Props = {
  measure: Measure
  priceText: string
  realText: string
  realUnit: Unit
  onPrice: (text: string) => void
  onReal: (text: string, unit: Unit) => void
  /** The catalogue has no real weight, only the price. */
  hideRealWeight?: boolean
}

/** Collapsed "Price" section of an item: price (per unit or per kilo) and real weight. */
export function PriceDisclosure({
  measure,
  priceText,
  realText,
  realUnit,
  onPrice,
  onReal,
  hideRealWeight = false,
}: Props) {
  const { t } = useTranslation('orderForm')
  const [open, setOpen] = useState(() => priceText.trim() !== '' || realText.trim() !== '')
  const id = useId()
  const panelId = `${id}-panel`
  const priceInvalid = priceText.trim() !== '' && parseMoney(priceText) === null

  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="ghost"
        className="self-start px-2"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronDown
          className={`size-5 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
        {t('price.toggle')}
      </Button>
      {open && (
        <div id={panelId} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-price`} className="text-(length:--type-label-size) font-medium">
              {measure === 'weight' ? t('price.kiloPrice') : t('price.unitPrice')}
            </label>
            <div
              className={`flex items-center rounded-sm border-[1.5px] bg-surface-raised focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-brand-strong ${priceInvalid ? 'border-danger' : 'border-line-strong'}`}
            >
              <input
                id={`${id}-price`}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                className="h-[45px] min-w-0 flex-1 border-0 bg-transparent px-3 text-right tabular-nums text-ink outline-0"
                value={priceText}
                aria-invalid={priceInvalid ? true : undefined}
                onChange={(e) => onPrice(e.target.value)}
              />
              <span className="pr-3 text-ink-muted">{measure === 'weight' ? '€/kg' : '€'}</span>
            </div>
            {priceInvalid && (
              <span className="text-(length:--type-caption-size) text-danger">
                {t('price.invalid')}
              </span>
            )}
          </div>
          {measure === 'weight' && !hideRealWeight && (
            <WeightField
              label={t('price.realWeight')}
              text={realText}
              unit={realUnit}
              onChange={onReal}
            />
          )}
        </div>
      )}
    </div>
  )
}
