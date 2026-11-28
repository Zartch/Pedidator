/* eslint-disable react-refresh/only-export-components -- draft and storage helpers live next to the component that owns them (the step lists no separate file) */
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { displayUnit, formatWeight, parseWeight, toInputValue } from '@shared/weight'

export type Unit = 'g' | 'kg'

const STORAGE_KEY = 'pedidator.weightUnit'

/** Last unit used on this device (storage can be blocked: then grams). */
export function readLastUnit(): Unit {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'kg' ? 'kg' : 'g'
  } catch {
    return 'g'
  }
}

function rememberUnit(unit: Unit): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, unit)
  } catch {
    // Storage blocked: the choice is not remembered.
  }
}

/** Text and unit that show `grams`, in the unit they are best displayed in. */
export function weightToField(grams: number | null | undefined): { text: string; unit: Unit } {
  if (grams == null) return { text: '', unit: readLastUnit() }
  const unit = displayUnit(grams)
  return { text: toInputValue(grams, unit), unit }
}

type Props = {
  label: string
  text: string
  unit: Unit
  onChange: (text: string, unit: Unit) => void
  onEnter?: () => void
  inputId?: string
}

/**
 * Number + g / kg selector. Switching the unit converts what is typed; below the
 * field shows the equivalence. Storage is always integer grams via `parseWeight`.
 */
export function WeightField({ label, text, unit, onChange, onEnter, inputId }: Props) {
  const { t } = useTranslation('orderForm')
  const autoId = useId()
  const id = inputId ?? autoId
  const hintId = `${id}-hint`
  const grams = parseWeight(text, unit)
  const empty = text.trim() === ''
  const bad = grams === null && !empty

  function switchUnit(next: Unit) {
    if (next === unit) return
    rememberUnit(next)
    onChange(grams === null ? text : toInputValue(grams, next), next)
  }

  const hint =
    grams !== null
      ? t('weight.equals', { value: formatWeight(grams) })
      : empty
        ? t('weight.emptyHint')
        : unit === 'g'
          ? t('weight.badGrams')
          : t('weight.badKilos')

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-(length:--type-label-size) font-medium">
        {label}
      </label>
      <div className="flex gap-2">
        <div
          className={`flex min-h-(--touch-min) min-w-0 flex-1 items-center rounded-sm border-[1.5px] bg-surface-raised focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-brand-strong ${bad ? 'border-danger' : 'border-line-strong'}`}
        >
          <input
            id={id}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            className="h-[45px] w-full min-w-0 border-0 bg-transparent px-3 text-right tabular-nums text-ink outline-0"
            value={text}
            aria-invalid={bad ? true : undefined}
            aria-describedby={hintId}
            onChange={(e) => onChange(e.target.value, unit)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && onEnter) {
                e.preventDefault()
                onEnter()
              }
            }}
          />
        </div>
        <div
          role="group"
          aria-label={t('weight.unit')}
          className="inline-flex flex-none gap-[3px] rounded-md border-[1.5px] border-line-strong bg-surface-raised p-[3px]"
        >
          {(['g', 'kg'] as const).map((u) => (
            <button
              key={u}
              type="button"
              aria-pressed={unit === u}
              onClick={() => switchUnit(u)}
              className="min-h-[39px] min-w-11 cursor-pointer rounded-sm border-0 bg-transparent px-3 font-semibold text-ink-muted aria-pressed:bg-brand-soft aria-pressed:text-brand-strong aria-pressed:shadow-[inset_0_0_0_1.5px_var(--brand-strong)]"
            >
              {t(`weight.${u}`)}
            </button>
          ))}
        </div>
      </div>
      <span
        id={hintId}
        className={`text-(length:--type-caption-size) leading-(--type-caption-line) tabular-nums ${bad ? 'text-danger' : 'text-ink-muted'}`}
      >
        {hint}
      </span>
    </div>
  )
}
