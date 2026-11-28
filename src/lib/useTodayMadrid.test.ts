import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { msUntilMadridMidnight, useTodayMadrid } from './useTodayMadrid'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('msUntilMadridMidnight', () => {
  it('counts to the next Madrid midnight', () => {
    // 21:30 UTC in June = 23:30 Madrid (UTC+2)
    expect(msUntilMadridMidnight(new Date('2030-06-10T21:30:00Z'))).toBe(30 * 60000)
  })
  it('accounts for the 25-hour day when clocks go back', () => {
    // 2030-10-27: 00:00 Madrid = 22:00Z on the 26th, next midnight = 23:00Z on the 27th
    expect(msUntilMadridMidnight(new Date('2030-10-26T22:00:00Z'))).toBe(25 * 3600000)
  })
})

describe('useTodayMadrid', () => {
  it('changes the day when Madrid midnight passes', () => {
    vi.setSystemTime(new Date('2030-06-10T21:59:00Z')) // 23:59 Madrid
    const { result } = renderHook(() => useTodayMadrid())
    expect(result.current).toBe('2030-06-10')
    act(() => {
      vi.advanceTimersByTime(2 * 60000)
    })
    expect(result.current).toBe('2030-06-11')
  })

  it('refreshes when the app becomes visible again after the clock moved', () => {
    vi.setSystemTime(new Date('2030-06-10T10:00:00Z'))
    const { result } = renderHook(() => useTodayMadrid())
    expect(result.current).toBe('2030-06-10')
    // The clock jumps without timers firing (device asleep).
    vi.setSystemTime(new Date('2030-06-11T10:00:00Z'))
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(result.current).toBe('2030-06-11')
  })

  it('refreshes on window focus', () => {
    vi.setSystemTime(new Date('2030-06-10T10:00:00Z'))
    const { result } = renderHook(() => useTodayMadrid())
    vi.setSystemTime(new Date('2030-06-12T10:00:00Z'))
    act(() => {
      window.dispatchEvent(new Event('focus'))
    })
    expect(result.current).toBe('2030-06-12')
  })
})
