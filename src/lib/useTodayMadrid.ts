import { useEffect, useState } from 'react'
import { madridDateTimeToUtcIso, nextDay, todayMadrid } from './dates'

/** Milliseconds from `now` until the next midnight in Madrid (DST-aware). */
export function msUntilMadridMidnight(now: Date = new Date()): number {
  const next = madridDateTimeToUtcIso(nextDay(todayMadrid(now)), '00:00')
  return Math.max(1, Date.parse(next) - now.getTime())
}

/**
 * Today's day in Madrid, kept current: it changes at midnight (timer to the
 * next Madrid midnight) and is re-checked when the app returns to the
 * foreground (`visibilitychange`, `focus`), where timers may have been paused.
 */
export function useTodayMadrid(): string {
  const [today, setToday] = useState(() => todayMadrid())

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const refresh = () => {
      setToday(todayMadrid())
      clearTimeout(timer)
      timer = setTimeout(refresh, msUntilMadridMidnight())
    }
    // Catch a change between the first render and this effect.
    refresh()
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', refresh)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  return today
}
