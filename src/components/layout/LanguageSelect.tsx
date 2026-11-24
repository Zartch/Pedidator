import { useTranslation } from 'react-i18next'
import { LOCALES, resolveLocale } from '@/i18n'
import { applyLocale } from './locale'

/** Language selector (ca / es). Native select: it opens with the system picker on iPad. */
export function LanguageSelect() {
  const { t, i18n } = useTranslation('common')
  const current = resolveLocale(i18n.resolvedLanguage ?? i18n.language, null, null)

  return (
    <label className="flex items-center">
      <span className="sr-only">{t('language.label')}</span>
      <select
        value={current}
        onChange={(event) => applyLocale(resolveLocale(event.target.value, null, null))}
        className="min-h-(--touch-min) rounded-sm border border-line-strong bg-surface-raised px-2 font-medium text-ink text-(length:--type-label-size)"
      >
        {LOCALES.map((locale) => (
          <option key={locale} value={locale}>
            {t(`language.${locale}`)}
          </option>
        ))}
      </select>
    </label>
  )
}
