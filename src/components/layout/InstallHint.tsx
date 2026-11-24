/* eslint-disable react-refresh/only-export-components -- the pure detection is exported for tests. */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Share } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const DISMISS_KEY = 'pedidator.installHint.dismissed'

export type InstallEnv = {
  userAgent: string
  /** The app is already installed (iOS `navigator.standalone` or `display-mode: standalone`). */
  standalone: boolean
  /** `navigator.maxTouchPoints`: iPadOS reports a desktop Mac user agent. */
  maxTouchPoints: number
}

/** Safari on iPhone, iPod or iPad (not Chrome, Firefox, Edge or in-app browsers on iOS). */
export function isIosSafari({ userAgent, maxTouchPoints }: InstallEnv): boolean {
  const ipadOs = /Macintosh/.test(userAgent) && maxTouchPoints > 1
  const ios = /iPhone|iPad|iPod/.test(userAgent) || ipadOs
  const safari =
    /Safari\//.test(userAgent) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|YaBrowser|DuckDuckGo|GSA\//.test(userAgent)
  return ios && safari
}

/** Show the hint only in iOS Safari when the app is not installed on the home screen. */
export function shouldShowInstallHint(env: InstallEnv): boolean {
  return isIosSafari(env) && !env.standalone
}

function readEnv(): InstallEnv {
  const standalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
    (typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches)
  return {
    userAgent: window.navigator.userAgent,
    standalone,
    maxTouchPoints: window.navigator.maxTouchPoints ?? 0,
  }
}

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

function rememberDismissed(): void {
  try {
    window.localStorage.setItem(DISMISS_KEY, '1')
  } catch {
    // Storage blocked: the hint comes back on the next visit.
  }
}

/** Safari on iOS/iPadOS, app not installed: explains how to add it to the home screen. */
export function InstallHint() {
  const { t } = useTranslation('common')
  const [dismissed, setDismissed] = useState(readDismissed)
  const [env] = useState(readEnv)

  if (dismissed || !shouldShowInstallHint(env)) return null

  return (
    <section className="mx-4 mt-4 flex flex-wrap items-start gap-3 rounded-md border border-line bg-surface-raised p-4 tablet:mx-6">
      <Share className="mt-1 size-5 shrink-0 text-brand-strong" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold text-(length:--type-body-size)">{t('install.title')}</h2>
        <p className="text-(length:--type-label-size) text-ink-muted">{t('install.body')}</p>
      </div>
      <Button
        size="md"
        onClick={() => {
          rememberDismissed()
          setDismissed(true)
        }}
      >
        {t('install.dismiss')}
      </Button>
    </section>
  )
}
