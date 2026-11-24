import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlaskConical } from 'lucide-react'
import { AppDialog } from '@/components/ui/AppDialog'
import { Button } from '@/components/ui/Button'
import { clearDemoData, loadDemoData } from '@/demo/seed'

/** Demo only: says the data stays on this device, and loads or clears the sample data. */
export function DemoBanner() {
  const { t } = useTranslation('common')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(false)
    try {
      await action()
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 bg-brand-soft px-4 py-2 text-ink tablet:px-6">
      <p className="flex min-w-0 items-center gap-2 font-semibold text-(length:--type-label-size)">
        <FlaskConical className="size-5 shrink-0" aria-hidden="true" />
        <span>{t('demo.notice')}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="md"
          disabled={busy}
          onClick={() => void run(() => loadDemoData())}
        >
          {t('demo.load')}
        </Button>
        <Button variant="danger" size="md" disabled={busy} onClick={() => setConfirming(true)}>
          {t('demo.clear')}
        </Button>
      </div>
      {error && (
        <p role="alert" className="w-full text-danger text-(length:--type-label-size)">
          {t('demo.error')}
        </p>
      )}

      <AppDialog
        open={confirming}
        title={t('demo.clearTitle')}
        onClose={() => setConfirming(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              {t('demo.cancel')}
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await clearDemoData()
                  setConfirming(false)
                })
              }
            >
              {t('demo.confirmClear')}
            </Button>
          </>
        }
      >
        <p className="text-(length:--type-body-size)">{t('demo.clearBody')}</p>
      </AppDialog>
    </div>
  )
}
