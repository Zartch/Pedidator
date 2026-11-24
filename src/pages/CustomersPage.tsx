import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useCustomers } from '@/data/hooks'
import { nameKey } from '@shared/nameKey'

/** Client list with a search by name that ignores case and accents. */
export default function CustomersPage() {
  const { t } = useTranslation('customers')
  const customers = useCustomers()
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const key = nameKey(query)
    return (customers ?? []).filter((c) => c.nameKey.includes(key))
  }, [customers, query])

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-(length:--type-title-size) leading-(--type-title-line) font-[650]">
        {t('title')}
      </h2>

      <label className="flex flex-col gap-1">
        <span className="sr-only">{t('searchLabel')}</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="min-h-(--touch-min) rounded-sm border border-line-strong bg-surface-raised px-3 text-(length:--type-body-size) text-ink"
        />
      </label>

      {customers === undefined ? null : customers.length === 0 ? (
        <p className="text-ink-muted">{t('empty')}</p>
      ) : visible.length === 0 ? (
        <p className="text-ink-muted">{t('noMatches')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((c) => (
            <li key={c.id}>
              <Link
                to={`/customers/${c.id}`}
                className="flex min-h-(--touch-min) flex-col justify-center rounded-md border border-line bg-surface-raised px-4 py-2 text-ink"
              >
                <span className="font-semibold text-(length:--type-body-size)">{c.name}</span>
                {c.phone ? (
                  <span className="tabular-nums text-(length:--type-caption-size) text-ink-muted">
                    {c.phone}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
