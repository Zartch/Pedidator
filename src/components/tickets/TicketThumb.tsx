import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Ticket } from '@shared/types'
import { getBlob } from '@/data/repo/blobs'

const BOX =
  'flex size-12 flex-none items-center justify-center overflow-hidden rounded-md text-center font-semibold text-[11px] leading-[14px] text-ink-muted'

/** Ticket thumbnail: cached photo, a placeholder that still opens the viewer, or "no photo". */
export function TicketThumb({ ticket, onOpen }: { ticket: Ticket; onOpen: () => void }) {
  const { t } = useTranslation('tickets')
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    void getBlob('tickets', ticket.id, 'thumb').then((blob) => {
      if (cancelled || !blob) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [ticket.id])

  if (url) {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label={t('photo.open')}
        className={`${BOX} cursor-pointer border border-line bg-surface-sunken p-0`}
      >
        <img src={url} alt="" className="size-full object-cover" />
      </button>
    )
  }
  if (ticket.photo) {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label={t('photo.open')}
        className={`${BOX} cursor-pointer border border-line bg-surface-sunken`}
      >
        {t('photo.placeholder')}
      </button>
    )
  }
  return (
    <div
      role="img"
      aria-label={t('photo.none')}
      className={`${BOX} border-[1.5px] border-dashed border-line-strong`}
    >
      {t('photo.none')}
    </div>
  )
}
