import { useLayoutEffect, type ReactNode } from 'react'
import { deriveBrand } from '@shared/theme'

const BRAND_VARIABLES = ['--brand', '--on-brand', '--brand-strong', '--brand-soft'] as const

type Props = {
  /** Company color (`#rrggbb`), or null for the neutral theme. */
  color: string | null
  children: ReactNode
}

/**
 * Puts the four brand tokens on the root element. Without a valid color the
 * neutral values from tokens.css apply. Tokens for shadcn (--primary, --ring...)
 * already point at these variables, so they follow the company color too.
 */
export function BrandTheme({ color, children }: Props) {
  useLayoutEffect(() => {
    const style = document.documentElement.style
    const derived = color ? deriveBrand(color) : null
    if (!derived) {
      for (const name of BRAND_VARIABLES) style.removeProperty(name)
      return
    }
    style.setProperty('--brand', derived.brand)
    style.setProperty('--on-brand', derived.onBrand)
    style.setProperty('--brand-strong', derived.brandStrong)
    style.setProperty('--brand-soft', derived.brandSoft)
    return () => {
      for (const name of BRAND_VARIABLES) style.removeProperty(name)
    }
  }, [color])

  return <>{children}</>
}
