import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { dateLocale, dayToDisplayDate, weekDays } from '@/lib/dates'
import {
  CalendarDay,
  WeekdayHeaders,
  type CalendarProps,
} from './MonthCalendar'

/** The week (Monday to Sunday) of the selected day, for phones. */
export function WeekStrip({ day, today, marks, onSelect }: CalendarProps) {
  const { t, i18n } = useTranslation('day')
  const locale = dateLocale(i18n.language)
  const days = weekDays(day)
  const label = t('calendar.week', {
    from: format(dayToDisplayDate(days[0]), 'd MMMM', { locale }),
    to: format(dayToDisplayDate(days[6]), 'd MMMM', { locale }),
  })

  return (
    <div role="group" aria-label={label} className="grid grid-cols-7 gap-1">
      <WeekdayHeaders />
      {days.map((d) => (
        <CalendarDay
          key={d}
          day={d}
          selected={d === day}
          today={d === today}
          marks={marks[d]}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
