import { useEffect, useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './i18n'
import { resolveLocale } from '@/i18n'
import { AppShell } from '@/components/layout/AppShell'
import { applyLocale, readStoredLocale } from '@/components/layout/locale'
import { useSession } from '@/data/hooks'
import { getSession, startDemoSession } from '@/data/session'
import { AppRoutes } from '@/routes'
import { BrandTheme } from '@/theme/BrandTheme'

// Unset VITE_MODE is demo too, so local development and e2e work without a server.
// F2-8 (login) changes this: only VITE_MODE=demo keeps the local-only session.
const IS_DEMO = import.meta.env.VITE_MODE === 'demo' || !import.meta.env.VITE_MODE

// Shared promise: React StrictMode runs effects twice, and two sessions must not race.
let demoStart: Promise<unknown> | null = null

export default function App() {
  const { t } = useTranslation('common')
  const session = useSession()
  const [brandColor, setBrandColor] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    applyLocale(resolveLocale(null, null, readStoredLocale()))
  }, [])

  useEffect(() => {
    if (!IS_DEMO || getSession()) return
    demoStart ??= startDemoSession().catch(() => {
      setFailed(true)
      demoStart = null
    })
  }, [])

  return (
    <BrandTheme color={IS_DEMO ? brandColor : null}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AppShell
          companyName={t('app.name')}
          demo={IS_DEMO}
          brandColor={brandColor}
          onBrandColorChange={setBrandColor}
        >
          {session ? <AppRoutes /> : failed ? <p role="alert">{t('session.error')}</p> : null}
        </AppShell>
      </BrowserRouter>
    </BrandTheme>
  )
}
