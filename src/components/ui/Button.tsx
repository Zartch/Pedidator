import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'md' | 'lg' | 'icon'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  block?: boolean
}

// Colors are tokens from src/styles/tokens.css (docs/design/components.css, .pd-btn).
const BASE =
  'inline-flex items-center justify-center gap-2 rounded-md border-[1.5px] font-semibold text-(length:--type-body-size) leading-(--type-body-line) cursor-pointer select-none [-webkit-tap-highlight-color:transparent] active:brightness-95 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-strong disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-sunken disabled:text-ink-muted disabled:brightness-100'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-on-brand border-brand-strong',
  secondary: 'bg-surface-raised text-ink border-line-strong',
  danger: 'bg-surface-raised text-danger border-danger',
  ghost: 'bg-transparent text-brand-strong border-transparent',
}

const SIZES: Record<Size, string> = {
  md: 'min-h-(--touch-min) px-5',
  lg: 'min-h-(--touch-lg) px-6 text-[18px] leading-6',
  icon: 'size-(--touch-min) p-0',
}

/** Button with touch-size variants. `type="button"` unless the caller asks otherwise. */
export function Button({
  variant = 'secondary',
  size = 'md',
  block = false,
  className,
  type = 'button',
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={cn(BASE, VARIANTS[variant], SIZES[size], block && 'w-full', className)}
      {...rest}
    />
  )
}
