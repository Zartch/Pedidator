import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UserPlus } from 'lucide-react'
import { nameKey } from '@shared/nameKey'
import { useCustomerSuggestions } from '@/data/hooks'

type Props = {
  value: string
  onChange: (text: string) => void
  error?: boolean
}

/** Customer field with suggestions; an unknown name offers "Create customer «X»". */
export function CustomerPicker({ value, onChange, error }: Props) {
  const { t } = useTranslation('orderForm')
  const [picked, setPicked] = useState(value.trim() !== '')
  const text = value.trim()
  const suggestions = useCustomerSuggestions(text, 5)
  const exact = suggestions?.some((c) => c.nameKey === nameKey(text))
  const showList = !picked && text !== '' && !exact && !!suggestions?.length
  const isNew = text !== '' && suggestions !== undefined && !exact

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="order-customer" className="text-(length:--type-label-size) font-medium">
        {t('customer.label')}
      </label>
      <input
        id="order-customer"
        type="text"
        autoComplete="off"
        className={`min-h-(--touch-min) w-full rounded-sm border-[1.5px] bg-surface-raised px-3 text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-strong ${error ? 'border-danger' : 'border-line-strong'}`}
        value={value}
        aria-invalid={error ? true : undefined}
        onChange={(e) => {
          onChange(e.target.value)
          setPicked(false)
        }}
      />
      {showList && (
        <ul className="flex flex-col overflow-hidden rounded-sm border border-line">
          {suggestions.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="min-h-(--touch-min) w-full cursor-pointer border-0 bg-surface-raised px-3 text-left text-ink"
                onClick={() => {
                  onChange(c.name)
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
        <span className="inline-flex items-center gap-1 text-(length:--type-caption-size) font-medium text-brand-strong">
          <UserPlus className="size-4" aria-hidden="true" />
          {t('customer.create', { name: text })}
        </span>
      ) : (
        <span className="text-(length:--type-caption-size) text-ink-muted">
          {t('customer.hint')}
        </span>
      )}
      {error && (
        <span className="text-(length:--type-caption-size) text-danger">
          {t('customer.error')}
        </span>
      )}
    </div>
  )
}
