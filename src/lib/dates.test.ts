import { describe, expect, it } from 'vitest'
import { madridDay } from '@shared/progress'
import {
  addDays,
  addMonths,
  isDay,
  madridDateTimeToUtcIso,
  madridDayRangeUtc,
  madridMonthRangeUtc,
  monthGrid,
  monthOfWeek,
  monthsAround,
  nextDay,
  previousDay,
  todayMadrid,
  utcIsoToMadridTime,
  weekDays,
  weekMonday,
  weekOfMonth,
  weeksAround,
} from './dates'

describe('day arithmetic', () => {
  it('moves across month and year ends', () => {
    expect(nextDay('2026-12-31')).toBe('2027-01-01')
    expect(previousDay('2026-03-01')).toBe('2026-02-28')
    expect(nextDay('2028-02-28')).toBe('2028-02-29')
    expect(addDays('2026-12-17', 14)).toBe('2026-12-31')
  })

  it('validates days', () => {
    expect(isDay('2026-12-17')).toBe(true)
    expect(isDay('2026-02-30')).toBe(false)
    expect(isDay('2026-1-7')).toBe(false)
    expect(isDay('hoy')).toBe(false)
  })

  it('computes today in Madrid, not in UTC', () => {
    expect(todayMadrid(new Date('2026-12-17T23:30:00Z'))).toBe('2026-12-18')
    expect(todayMadrid(new Date('2026-07-17T21:59:00Z'))).toBe('2026-07-17')
    expect(todayMadrid(new Date('2026-07-17T22:00:00Z'))).toBe('2026-07-18')
  })

  it('adds months', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
  })
})

describe('week and month grids', () => {
  it('week starts on Monday', () => {
    const w = weekDays('2026-12-17')
    expect(w[0]).toBe('2026-12-14')
    expect(w[6]).toBe('2026-12-20')
    expect(weekDays('2026-12-20')[0]).toBe('2026-12-14')
    expect(weekDays('2026-12-21')[0]).toBe('2026-12-21')
  })

  it('month grid covers whole weeks', () => {
    const g = monthGrid('2026-12')
    expect(g[0]).toBe('2026-11-30')
    expect(g.at(-1)).toBe('2027-01-03')
    expect(g.length % 7).toBe(0)
    expect(monthGrid('2026-06')).toHaveLength(35)
  })
})

describe('Madrid time conversion', () => {
  it('converts winter and summer times', () => {
    expect(madridDateTimeToUtcIso('2026-12-17', '11:00')).toBe(
      '2026-12-17T10:00:00.000Z',
    )
    expect(madridDateTimeToUtcIso('2026-07-17', '11:00')).toBe(
      '2026-07-17T09:00:00.000Z',
    )
    expect(utcIsoToMadridTime('2026-12-17T10:00:00.000Z')).toBe('11:00')
    expect(utcIsoToMadridTime('2026-07-17T09:00:00.000Z')).toBe('11:00')
  })

  it('handles the March change (2026-03-29)', () => {
    expect(madridDateTimeToUtcIso('2026-03-29', '01:59')).toBe(
      '2026-03-29T00:59:00.000Z',
    )
    expect(madridDateTimeToUtcIso('2026-03-29', '03:00')).toBe(
      '2026-03-29T01:00:00.000Z',
    )
    // 02:30 does not exist: it moves forward to 03:30
    expect(madridDateTimeToUtcIso('2026-03-29', '02:30')).toBe(
      '2026-03-29T01:30:00.000Z',
    )
    expect(utcIsoToMadridTime('2026-03-29T00:59:00.000Z')).toBe('01:59')
    expect(utcIsoToMadridTime('2026-03-29T01:00:00.000Z')).toBe('03:00')
  })

  it('handles the October change (2026-10-25)', () => {
    expect(madridDateTimeToUtcIso('2026-10-25', '01:59')).toBe(
      '2026-10-24T23:59:00.000Z',
    )
    // 02:30 happens twice: the first (summer) one
    expect(madridDateTimeToUtcIso('2026-10-25', '02:30')).toBe(
      '2026-10-25T00:30:00.000Z',
    )
    expect(madridDateTimeToUtcIso('2026-10-25', '03:00')).toBe(
      '2026-10-25T02:00:00.000Z',
    )
    expect(utcIsoToMadridTime('2026-10-25T00:30:00.000Z')).toBe('02:30')
    expect(utcIsoToMadridTime('2026-10-25T01:30:00.000Z')).toBe('02:30')
  })

  it('round-trips with madridDay', () => {
    for (const day of [
      '2026-03-28',
      '2026-03-29',
      '2026-03-30',
      '2026-10-24',
      '2026-10-25',
      '2026-10-26',
    ]) {
      for (const time of ['00:00', '00:30', '09:15', '23:59']) {
        const iso = madridDateTimeToUtcIso(day, time)
        expect(madridDay(iso)).toBe(day)
        expect(utcIsoToMadridTime(iso)).toBe(time)
      }
    }
  })

  it('rejects malformed input', () => {
    expect(() => madridDateTimeToUtcIso('2026-12-17', '25:00')).toThrow(
      RangeError,
    )
    expect(() => madridDateTimeToUtcIso('17/12/2026', '10:00')).toThrow(
      RangeError,
    )
    expect(() => utcIsoToMadridTime('nope')).toThrow(RangeError)
  })
})

describe('UTC ranges', () => {
  it('a normal day is 24 hours', () => {
    expect(madridDayRangeUtc('2026-12-17')).toEqual({
      from: '2026-12-16T23:00:00.000Z',
      to: '2026-12-17T23:00:00.000Z',
    })
  })

  it('the March day is 23 hours, the October day 25', () => {
    const march = madridDayRangeUtc('2026-03-29')
    expect(march).toEqual({
      from: '2026-03-28T23:00:00.000Z',
      to: '2026-03-29T22:00:00.000Z',
    })
    expect((Date.parse(march.to) - Date.parse(march.from)) / 3600000).toBe(23)
    const oct = madridDayRangeUtc('2026-10-25')
    expect(oct).toEqual({
      from: '2026-10-24T22:00:00.000Z',
      to: '2026-10-25T23:00:00.000Z',
    })
    expect((Date.parse(oct.to) - Date.parse(oct.from)) / 3600000).toBe(25)
  })

  it('month ranges follow the offset at each end', () => {
    expect(madridMonthRangeUtc('2026-03')).toEqual({
      from: '2026-02-28T23:00:00.000Z',
      to: '2026-03-31T22:00:00.000Z',
    })
    expect(madridMonthRangeUtc('2026-10')).toEqual({
      from: '2026-09-30T22:00:00.000Z',
      to: '2026-10-31T23:00:00.000Z',
    })
  })
})

describe('drag windows', () => {
  it('weeksAround lists the Mondays n weeks before and after, across month and year', () => {
    const w = weeksAround('2026-12-31', 2)
    expect(w).toEqual([
      '2026-12-14',
      '2026-12-21',
      '2026-12-28',
      '2027-01-04',
      '2027-01-11',
    ])
    expect(weeksAround('2026-12-17', 26)).toHaveLength(53)
    expect(weeksAround('2026-12-17', 26)[26]).toBe(weekMonday('2026-12-17'))
  })

  it('monthsAround lists the months n before and after, across years', () => {
    expect(monthsAround('2026-12', 2)).toEqual([
      '2026-10',
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-02',
    ])
    expect(monthsAround('2026-01', 1)).toEqual([
      '2025-12',
      '2026-01',
      '2026-02',
    ])
  })

  it('monthOfWeek: the selected day month if in the week, else the Thursday month', () => {
    // The week 2026-11-30 .. 2026-12-06 crosses a month (Thursday is 3 December).
    expect(monthOfWeek('2026-11-30', '2026-11-30')).toBe('2026-11')
    expect(monthOfWeek('2026-11-30', '2026-12-05')).toBe('2026-12')
    expect(monthOfWeek('2026-11-30', '2026-12-20')).toBe('2026-12')
    // Week 2025-12-29 .. 2026-01-04 crosses a year (Thursday is 1 January).
    expect(monthOfWeek('2025-12-29', '2026-03-01')).toBe('2026-01')
    expect(monthOfWeek('2025-12-29', '2025-12-30')).toBe('2025-12')
    // Thursday in the old month: 2026-06-29 .. 2026-07-05 has Thursday 2 July; 2026-03-30 .. 04-05 has Thursday 2 April.
    expect(monthOfWeek('2026-03-23', '2026-08-01')).toBe('2026-03')
  })

  it('weekOfMonth: the selected day week if in the month, else the week of the 1st', () => {
    expect(weekOfMonth('2026-12', '2026-12-17')).toBe('2026-12-14')
    // 2026-12-01 is a Tuesday: the week starts on 30 November.
    expect(weekOfMonth('2026-12', '2026-11-20')).toBe('2026-11-30')
    expect(weekOfMonth('2027-01', '2026-12-17')).toBe('2026-12-28')
    // A day of the month that belongs to a week starting in the previous month.
    expect(weekOfMonth('2026-12', '2026-12-02')).toBe('2026-11-30')
  })
})
