import { useEffect, useId, useRef, type ReactNode, type SyntheticEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { Button } from './Button'

type Props = {
  open: boolean
  title: string
  /** Called only by the close button. Escape and taps outside never close the dialog. */
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

/**
 * Native <dialog> opened with showModal(). Its body scrolls inside the dialog,
 * so the on-screen keyboard on iPad never hides the fields.
 */
export function AppDialog({ open, title, onClose, children, footer }: Props) {
  const { t } = useTranslation('common')
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal()
      else dialog.setAttribute('open', '')
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close()
      else dialog.removeAttribute('open')
    }
  }, [open])

  // A stray Escape would lose what the user is typing: keep the dialog open.
  function keepOpen(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault()
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={keepOpen}
      className="m-auto flex max-h-[calc(100svh-2rem)] w-[min(calc(100vw-2rem),36rem)] max-w-none flex-col overflow-hidden rounded-lg border border-line bg-surface-raised p-0 text-ink shadow-overlay backdrop:bg-ink/40 open:flex"
    >
      <div className="flex min-h-14 items-center gap-3 border-b border-line px-5">
        <h2
          id={titleId}
          className="min-w-0 flex-1 truncate text-(length:--type-heading-size) leading-(--type-heading-line) font-semibold"
        >
          {title}
        </h2>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label={t('dialog.close')}>
          <X className="size-5" aria-hidden="true" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
      {footer && (
        <div className="flex flex-wrap justify-end gap-3 border-t border-line px-5 py-3">
          {footer}
        </div>
      )}
    </dialog>
  )
}
