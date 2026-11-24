import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Archive } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DemoBar } from './DemoBar'
import { LanguageSelect } from './LanguageSelect'
import { MainNav } from './MainNav'

type Props = {
  companyName: string
  demo: boolean
  brandColor: string | null
  onBrandColorChange: (color: string | null) => void
  /** Content of the status bar (sync, offline...). The slot is always reserved. */
  status?: ReactNode
  children: ReactNode
}

/**
 * Frame of every screen: brand header, status bar slot, content and navigation
 * (docs/design/components.css, AppShell). Safe areas are respected on iOS.
 */
export function AppShell({
  companyName,
  demo,
  brandColor,
  onBrandColorChange,
  status,
  children,
}: Props) {
  const { t } = useTranslation('common')

  return (
    <div className="flex min-h-svh flex-col bg-surface text-ink">
      <header className="sticky top-0 z-10 bg-brand pt-[env(safe-area-inset-top)] text-on-brand">
        <div className="mx-auto flex min-h-14 w-full max-w-(--content-max) items-center gap-3 px-4 tablet:px-6">
          <h1 className="min-w-0 truncate font-display text-[20px] leading-6 font-[650]">
            {companyName}
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <LanguageSelect />
            <Link
              to="/archive"
              className="inline-flex min-h-(--touch-min) min-w-(--touch-min) items-center justify-center gap-2 rounded-md border border-on-brand/40 px-2 font-semibold text-(length:--type-label-size)"
            >
              <Archive className="size-5 shrink-0" aria-hidden="true" />
              <span className="sr-only tablet:not-sr-only">{t('nav.archive')}</span>
            </Link>
          </div>
        </div>
      </header>

      {demo && <DemoBar brandColor={brandColor} onBrandColorChange={onBrandColorChange} />}

      <div className="flex min-h-0 flex-1 flex-col tablet:flex-row">
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-9 flex-col">{status}</div>
          <div className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-6 tablet:px-6 tablet:pt-6">
            {children}
          </div>
        </main>
        <MainNav />
      </div>
    </div>
  )
}
