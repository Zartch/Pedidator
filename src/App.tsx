import { useTranslation } from 'react-i18next'
import './i18n'

export default function App() {
  const { t } = useTranslation()
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-(--content-max) flex-col gap-3 px-4 pt-[max(env(safe-area-inset-top),1rem)] tablet:px-6">
      <h1 className="font-display text-(length:--type-display-size) leading-(--type-display-line) font-bold tracking-(--type-display-tracking)">
        {t('app.name')}
      </h1>
    </main>
  )
}
