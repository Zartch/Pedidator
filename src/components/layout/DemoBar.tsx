import { useTranslation } from 'react-i18next'

// Example brands from docs/design/tokens.json (--demo-*). `null` is the neutral theme.
const DEMO_BRANDS = [
  { key: 'neutral', color: null },
  { key: 'butcher', color: '#a31d2f' },
  { key: 'fishmonger', color: '#0f67b3' },
  { key: 'greengrocer', color: '#39841c' },
  { key: 'bakery', color: '#e2a52b' },
] as const

type Props = {
  brandColor: string | null
  onBrandColorChange: (color: string | null) => void
}

/** Demo only: a picker for the example company colors. The data notice is DemoBanner. */
export function DemoBar({ brandColor, onBrandColorChange }: Props) {
  const { t } = useTranslation('common')
  const selected = DEMO_BRANDS.find((brand) => brand.color === brandColor)?.key ?? 'neutral'

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2 tablet:px-6">
      <label className="flex items-center gap-2 text-(length:--type-label-size)">
        <span className="font-medium text-ink-muted">{t('brand.label')}</span>
        <select
          value={selected}
          onChange={(event) => {
            const brand = DEMO_BRANDS.find((item) => item.key === event.target.value)
            onBrandColorChange(brand?.color ?? null)
          }}
          className="min-h-(--touch-min) rounded-sm border border-line-strong bg-surface-raised px-2 text-ink"
        >
          {DEMO_BRANDS.map((brand) => (
            <option key={brand.key} value={brand.key}>
              {t(`brand.${brand.key}`)}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
