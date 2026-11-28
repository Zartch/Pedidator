import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { getBlob } from '@/data/repo/blobs'
import { Button } from '@/components/ui/Button'

type Props = { ticketId: string; onClose: () => void }

/** Full-screen photo: the full-size local photo if present, otherwise the cached thumbnail. */
export function PhotoViewer({ ticketId, onClose }: Props) {
  const { t } = useTranslation('tickets')
  const [url, setUrl] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    void (async () => {
      const blob =
        (await getBlob('tickets', ticketId, 'photo')) ??
        (await getBlob('tickets', ticketId, 'thumb'))
      if (cancelled) return
      if (!blob) {
        setMissing(true)
        return
      }
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    })()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [ticketId])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('photo.viewerTitle')}
      className="fixed inset-0 z-50 flex flex-col bg-ink/95"
    >
      <div className="flex justify-end p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Button variant="secondary" size="icon" onClick={onClose} aria-label={t('photo.close')}>
          <X className="size-5" aria-hidden="true" />
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
        {url ? (
          <img src={url} alt={t('photo.label')} className="max-h-full max-w-full object-contain" />
        ) : (
          missing && <p className="text-center text-surface">{t('photo.unavailable')}</p>
        )}
      </div>
    </div>
  )
}
