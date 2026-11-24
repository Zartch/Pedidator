import type { LucideIcon } from 'lucide-react'
import { CalendarDays, Receipt, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

type Item = {
  to: string
  labelKey: string
  icon: LucideIcon
  isActive: (pathname: string) => boolean
}

const ITEMS: Item[] = [
  {
    to: '/',
    labelKey: 'nav.day',
    icon: CalendarDays,
    isActive: (path) => path === '/' || path.startsWith('/day/'),
  },
  {
    to: '/tickets',
    labelKey: 'nav.tickets',
    icon: Receipt,
    isActive: (path) => path.startsWith('/tickets'),
  },
  {
    to: '/customers',
    labelKey: 'nav.customers',
    icon: Users,
    isActive: (path) => path.startsWith('/customers'),
  },
]

/** Bottom bar on phones; a side rail from the tablet breakpoint (768px). */
export function MainNav() {
  const { t } = useTranslation('common')
  const { pathname } = useLocation()

  return (
    <nav
      aria-label={t('nav.label')}
      className="sticky bottom-0 z-10 flex border-t border-line bg-surface-raised pb-[env(safe-area-inset-bottom)] tablet:static tablet:order-first tablet:w-(--rail-width) tablet:flex-col tablet:gap-2 tablet:border-t-0 tablet:border-r tablet:pt-4"
    >
      {ITEMS.map((item) => {
        const active = item.isActive(pathname)
        const Icon = item.icon
        return (
          <Link
            key={item.to}
            to={item.to}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-h-(--bar-height) flex-1 flex-col items-center justify-center gap-0.5 font-semibold text-(length:--type-caption-size) leading-(--type-caption-line) tablet:flex-none',
              active ? 'text-brand-strong' : 'text-ink-muted',
            )}
          >
            <span
              className={cn(
                'grid h-7 w-14 place-items-center rounded-pill',
                active && 'bg-brand-soft',
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
            </span>
            {t(item.labelKey)}
          </Link>
        )
      })}
    </nav>
  )
}
