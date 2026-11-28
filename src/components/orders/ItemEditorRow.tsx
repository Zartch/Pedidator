/* eslint-disable react-refresh/only-export-components -- draft and storage helpers live next to the component that owns them (the step lists no separate file) */
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import { parseMoney } from '@shared/format'
import type { Measure, OrderItem } from '@shared/types'
import { parseWeight } from '@shared/weight'
import { useItemSuggestions } from '@/data/hooks'
import type { SaveOrderItem } from '@/data/repo/orders'
import { newId } from '@/lib/id'
import { Button } from '@/components/ui/Button'
import { PriceDisclosure } from './PriceDisclosure'
import { readLastUnit, WeightField, weightToField, type Unit } from './WeightField'

/** What the form keeps for one item while it is being edited. Text fields stay text until saving. */
export type ItemDraft = {
  /** Stable React key (the record id when editing an existing item). */
  key: string
  /** Id of the existing record; absent for new items. */
  id?: string
  name: string
  measure: Measure
  quantity: string
  weightText: string
  weightUnit: Unit
  notes: string
  prepDayBefore: boolean
  done: boolean
  priceText: string
  realText: string
  realUnit: Unit
}

export function emptyDraft(): ItemDraft {
  const unit = readLastUnit()
  return {
    key: newId(),
    name: '',
    measure: 'unit',
    quantity: '1',
    weightText: '',
    weightUnit: unit,
    notes: '',
    prepDayBefore: false,
    done: false,
    priceText: '',
    realText: '',
    realUnit: unit,
  }
}

/** Integer cents as editable text, e.g. 2490 -> "24,90". */
export function centsToText(cents: number): string {
  return `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, '0')}`
}

export function draftFromItem(item: OrderItem): ItemDraft {
  const ordered = weightToField(item.orderedGrams)
  const real = weightToField(item.weightGrams)
  return {
    key: item.id,
    id: item.id,
    name: item.name,
    measure: item.measure,
    quantity: String(item.quantity),
    weightText: ordered.text,
    weightUnit: ordered.unit,
    notes: item.notes ?? '',
    prepDayBefore: item.prepDayBefore,
    done: item.done,
    priceText: item.unitPriceCents == null ? '' : centsToText(item.unitPriceCents),
    realText: real.text,
    realUnit: real.unit,
  }
}

export type DraftResult =
  | { ok: true; item: SaveOrderItem }
  | { ok: false; error: 'weight' | 'price' }

/** Validates a draft and converts it to repository input (integer grams and cents). */
export function draftToInput(d: ItemDraft): DraftResult {
  let orderedGrams: number | null = null
  let weightGrams: number | null = null
  if (d.measure === 'weight') {
    if (d.weightText.trim() !== '') {
      orderedGrams = parseWeight(d.weightText, d.weightUnit)
      if (orderedGrams === null) return { ok: false, error: 'weight' }
    }
    if (d.realText.trim() !== '') {
      weightGrams = parseWeight(d.realText, d.realUnit)
      if (weightGrams === null) return { ok: false, error: 'weight' }
    }
  }
  let unitPriceCents: number | null = null
  if (d.priceText.trim() !== '') {
    unitPriceCents = parseMoney(d.priceText)
    if (unitPriceCents === null) return { ok: false, error: 'price' }
  }
  const quantity = Math.max(1, Math.floor(Number(d.quantity)) || 1)
  return {
    ok: true,
    item: {
      ...(d.id ? { id: d.id } : {}),
      name: d.name,
      measure: d.measure,
      quantity: d.measure === 'unit' ? quantity : 1,
      orderedGrams,
      prepDayBefore: d.prepDayBefore,
      done: d.done,
      notes: d.notes,
      unitPriceCents,
      weightGrams,
    },
  }
}

const INPUT =
  'min-h-(--touch-min) w-full rounded-sm border-[1.5px] border-line-strong bg-surface-raised px-3 text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-strong'
const LABEL = 'text-(length:--type-label-size) font-medium'

type Props = {
  draft: ItemDraft
  index: number
  count: number
  /** Changes whenever this row should take focus on its name field. */
  focusToken: number
  onChange: (next: ItemDraft) => void
  onMove: (delta: -1 | 1) => void
  onRemove: () => void
  /** Enter in quantity, weight or notes: move on to the next item's name. */
  onNext: () => void
}

/** One editable item: name with suggestions, units or weight, notes, prep switch and price. */
export function ItemEditorRow({
  draft,
  index,
  count,
  focusToken,
  onChange,
  onMove,
  onRemove,
  onNext,
}: Props) {
  const { t } = useTranslation('orderForm')
  const nameRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  const suggestions = useItemSuggestions(draft.name.trim(), 5)
  const list = (suggestions ?? []).filter(
    (s) => s.name.trim().toLowerCase() !== draft.name.trim().toLowerCase(),
  )
  const number = index + 1
  const set = (patch: Partial<ItemDraft>) => onChange({ ...draft, ...patch })

  useEffect(() => {
    if (focusToken > 0) nameRef.current?.focus()
  }, [focusToken])

  const enterNext = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onNext()
    }
  }

  return (
    <li
      aria-label={t('item.number', { n: number })}
      className="flex flex-col gap-3 rounded-md border border-line bg-surface-raised p-4"
    >
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor={`item-name-${draft.key}`} className={LABEL}>
            {t('item.name')}
          </label>
          <input
            id={`item-name-${draft.key}`}
            ref={nameRef}
            type="text"
            autoComplete="off"
            className={INPUT}
            value={draft.name}
            onChange={(e) => set({ name: e.target.value })}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          {focused && draft.name.trim() !== '' && list.length > 0 && (
            <ul className="flex flex-col overflow-hidden rounded-sm border border-line">
              {list.map((s) => (
                <li key={s.name}>
                  <button
                    type="button"
                    className="min-h-(--touch-min) w-full cursor-pointer border-0 bg-surface-raised px-3 text-left text-ink"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() =>
                      set({
                        name: s.name,
                        measure: s.measure,
                        prepDayBefore: s.prepDayBefore,
                        // The catalogue price is only a proposal: never overwrite one typed by hand.
                        ...(s.unitPriceCents != null && draft.priceText.trim() === ''
                          ? { priceText: centsToText(s.unitPriceCents) }
                          : {}),
                      })
                    }
                  >
                    {s.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-6 flex flex-none">
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('item.up')}
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ArrowUp className="size-5" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('item.down')}
            disabled={index === count - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDown className="size-5" aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon" aria-label={t('item.remove')} onClick={onRemove}>
            <Trash2 className="size-5 text-danger" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className={LABEL} id={`item-measure-${draft.key}`}>
          {t('item.measure')}
        </span>
        <div
          role="group"
          aria-labelledby={`item-measure-${draft.key}`}
          className="inline-flex gap-[3px] self-start rounded-md border-[1.5px] border-line-strong bg-surface-raised p-[3px]"
        >
          {(['unit', 'weight'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={draft.measure === m}
              onClick={() => set({ measure: m })}
              className="min-h-[39px] min-w-11 cursor-pointer rounded-sm border-0 bg-transparent px-3 font-semibold text-ink-muted aria-pressed:bg-brand-soft aria-pressed:text-brand-strong aria-pressed:shadow-[inset_0_0_0_1.5px_var(--brand-strong)]"
            >
              {m === 'unit' ? t('item.units') : t('item.weight')}
            </button>
          ))}
        </div>
      </div>

      {draft.measure === 'unit' ? (
        <div className="flex flex-col gap-1">
          <label htmlFor={`item-qty-${draft.key}`} className={LABEL}>
            {t('item.quantity')}
          </label>
          <input
            id={`item-qty-${draft.key}`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className={`${INPUT} text-right tabular-nums`}
            value={draft.quantity}
            onChange={(e) => set({ quantity: e.target.value.replace(/\D/g, '') })}
            onKeyDown={enterNext}
          />
        </div>
      ) : (
        <WeightField
          inputId={`item-weight-${draft.key}`}
          label={t('item.quantity')}
          text={draft.weightText}
          unit={draft.weightUnit}
          onChange={(weightText, weightUnit) => set({ weightText, weightUnit })}
          onEnter={onNext}
        />
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor={`item-notes-${draft.key}`} className={LABEL}>
          {t('item.notes')}
        </label>
        <input
          id={`item-notes-${draft.key}`}
          type="text"
          autoComplete="off"
          className={INPUT}
          value={draft.notes}
          onChange={(e) => set({ notes: e.target.value })}
          onKeyDown={enterNext}
        />
      </div>

      <div className="flex flex-wrap gap-x-6">
        <Switch
          label={t('item.prep')}
          checked={draft.prepDayBefore}
          onChange={(prepDayBefore) => set({ prepDayBefore })}
        />
        <Switch
          label={t('item.done')}
          checked={draft.done}
          onChange={(done) => set({ done })}
        />
      </div>

      <PriceDisclosure
        measure={draft.measure}
        priceText={draft.priceText}
        realText={draft.realText}
        realUnit={draft.realUnit}
        onPrice={(priceText) => set({ priceText })}
        onReal={(realText, realUnit) => set({ realText, realUnit })}
      />
    </li>
  )
}

function Switch({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex min-h-(--touch-min) cursor-pointer items-center gap-3 border-0 bg-transparent p-0 text-left font-medium text-ink"
    >
      <span
        aria-hidden="true"
        className="relative h-8 w-[52px] flex-none rounded-full bg-surface-raised shadow-[inset_0_0_0_2px_var(--line-strong)] group-aria-checked:bg-prep group-aria-checked:shadow-none after:absolute after:top-1.5 after:left-1.5 after:size-5 after:rounded-full after:bg-line-strong after:transition-transform group-aria-checked:after:translate-x-5 group-aria-checked:after:bg-on-status motion-reduce:after:transition-none"
      />
      {label}
    </button>
  )
}
