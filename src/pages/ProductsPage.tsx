import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Clock, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { useProducts } from '@/data/hooks'
import { nameKey } from '@shared/nameKey'

/** Product catalogue: search by name (ignores case and accents). No prices here. */
export default function ProductsPage() {
  const { t } = useTranslation('products')
  const products = useProducts()
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const key = nameKey(query)
    return (products ?? []).filter((p) => p.nameKey.includes(key))
  }, [products, query])

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-(length:--type-title-size) leading-(--type-title-line) font-[650]">
          {t('title')}
        </h2>
        <Link
          to="/products/new"
          className="inline-flex min-h-(--touch-min) items-center gap-2 rounded-md border-[1.5px] border-brand-strong bg-brand px-4 font-semibold text-on-brand focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-strong"
        >
          <Plus className="size-5" aria-hidden="true" />
          {t('new')}
        </Link>
      </div>

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

      {products === undefined ? null : products.length === 0 ? (
        <p className="py-8 text-center text-ink-muted">{t('empty')}</p>
      ) : visible.length === 0 ? (
        <p className="text-ink-muted">{t('noMatches')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((p) => (
            <li key={p.id}>
              <Link
                to={`/products/${p.id}`}
                className="flex min-h-(--touch-min) items-center justify-between gap-3 rounded-md border border-line bg-surface-raised px-4 py-2 text-ink"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-semibold text-(length:--type-body-size)">
                    {p.name}
                  </span>
                  <span className="text-(length:--type-caption-size) text-ink-muted">
                    {p.measure === 'weight' ? t('weight') : t('units')}
                  </span>
                </span>
                {p.prepDayBefore ? (
                  <Badge variant="prep" icon={Clock}>
                    {t('prepBadge')}
                  </Badge>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
