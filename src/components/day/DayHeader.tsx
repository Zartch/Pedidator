import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { capitalize, dateLocale, dayToDisplayDate } from '@/lib/dates'

type Props = {
  day: string
  isToday: boolean
  onSelect: (day: string) => void
  onToday: () => void
  previous: string
  next: string
}

/** Title with the selected day ("Dijous 17") and previous / next / today controls. */
export function DayHeader({
  day,
  isToday,
  onSelect,
  onToday,
  previous,
  next,
}: Props) {
  const { t, i18n } = useTranslation('day')
  const locale = dateLocale(i18n.language)
  const title = capitalize(format(dayToDisplayDate(day), 'EEEE d', { locale }))

  return (
    <div className="flex items-center gap-2">
      <h2 className="min-w-0 flex-1 truncate font-display text-(length:--type-title-size) leading-(--type-title-line) font-[650] tablet:text-(length:--type-display-size) tablet:leading-(--type-display-line) tablet:font-bold">
        {title}
      </h2>
      <Button
        variant={isToday ? 'ghost' : 'secondary'}
        onClick={onToday}
        aria-current={isToday ? 'date' : undefined}
        className="px-3"
      >
        {t('header.today')}
      </Button>
      <Button
        variant="secondary"
        size="icon"
        aria-label={t('header.previous')}
        onClick={() => onSelect(previous)}
      >
        <ChevronLeft className="size-5" aria-hidden="true" />
      </Button>
      <Button
        variant="secondary"
        size="icon"
        aria-label={t('header.next')}
        onClick={() => onSelect(next)}
      >
        <ChevronRight className="size-5" aria-hidden="true" />
      </Button>
    </div>
  )
}
