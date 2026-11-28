import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Variant = 'ok' | 'warn' | 'danger' | 'prep' | 'brand' | 'neutral'

type Props = {
  variant?: Variant
  /** Every badge carries an icon: state is never shown by color alone. */
  icon: LucideIcon
  children: ReactNode
}

const VARIANTS: Record<Variant, string> = {
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
  prep: 'bg-prep-soft text-prep',
  brand: 'bg-brand-soft text-brand-strong',
  neutral: 'bg-surface-sunken text-ink-muted',
}

/** State label (docs/design/components.css, .pd-badge): icon + text, pill shape. */
export function Badge({ variant = 'neutral', icon: Icon, children }: Props) {
  return (
    <span
      className={cn(
        'inline-flex min-h-6 items-center gap-1 rounded-pill py-0.5 pr-2.5 pl-2 font-semibold whitespace-nowrap tabular-nums text-(length:--type-caption-size) leading-(--type-caption-line)',
        VARIANTS[variant],
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {children}
    </span>
  )
}
