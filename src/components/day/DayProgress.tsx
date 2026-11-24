import { useTranslation } from 'react-i18next'

type Props = {
  total: number
  prepared: number
  delivered: number
  /** Delivered orders of the selected month, with the month name for the label. */
  monthDelivered?: { count: number; monthName: string }
}

/** "3 of 8 orders prepared" bar with what is left and what is delivered (docs/design, Progress). */
export function DayProgress({
  total,
  prepared,
  delivered,
  monthDelivered,
}: Props) {
  const { t } = useTranslation('day')
  const pct = total === 0 ? 0 : Math.round((prepared / total) * 100)

  return (
    <div className="flex flex-col gap-2">
      <div className="font-display text-[20px] leading-6 font-[650] tabular-nums">
        {total === 0
          ? t('progress.empty')
          : t('progress.title', { count: total, prepared })}
      </div>
      <div
        role="progressbar"
        aria-label={t('progress.label')}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={prepared}
        className="h-3 overflow-hidden rounded-pill bg-surface-sunken shadow-[inset_0_0_0_1px_var(--line)]"
      >
        <div
          className="h-full rounded-pill bg-brand-strong transition-[width] duration-200 motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-(length:--type-caption-size) leading-(--type-caption-line) font-medium text-ink-muted tabular-nums">
        <span>{t('progress.toPrepare', { count: total - prepared })}</span>
        <span>{t('progress.delivered', { count: delivered })}</span>
        {monthDelivered && (
          <span>
            {t('progress.monthDelivered', {
              count: monthDelivered.count,
              month: monthDelivered.monthName,
            })}
          </span>
        )}
      </div>
    </div>
  )
}
