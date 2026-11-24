import { useTranslation } from 'react-i18next'

// Placeholder: the real screen comes in its own roadmap step.
export default function CustomersPage() {
  const { t } = useTranslation('customers')
  return (
    <section>
      <h2 className="font-display text-(length:--type-title-size) leading-(--type-title-line) font-[650]">
        {t('title')}
      </h2>
    </section>
  )
}
