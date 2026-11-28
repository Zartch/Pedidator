import { useCallback, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

const ERROR = 'text-(length:--type-caption-size) leading-(--type-caption-line) text-danger'

/**
 * For one-tap writes with no dialog: runs the action and, if it fails, offers
 * an `alert` notice to render next to the control. The next attempt clears it.
 */
export function useActionRunner(): {
  run: (action: () => Promise<unknown>) => void
  alert: ReactNode
} {
  const { t } = useTranslation('common')
  const [failed, setFailed] = useState(false)
  const run = useCallback((action: () => Promise<unknown>) => {
    setFailed(false)
    // The action may throw synchronously (no session) or reject.
    Promise.resolve()
      .then(action)
      .catch(() => setFailed(true))
  }, [])
  const alert = failed ? (
    <p role="alert" className={ERROR}>
      {t('actionError')}
    </p>
  ) : null
  return { run, alert }
}
