import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parseWeight } from '@shared/weight'
import '@/i18n'
import { WeightField, type Unit } from './WeightField'

function Harness({ initialUnit = 'g' }: { initialUnit?: Unit }) {
  const [text, setText] = useState('')
  const [unit, setUnit] = useState<Unit>(initialUnit)
  const grams = parseWeight(text, unit)
  return (
    <>
      <WeightField
        label="Pes"
        text={text}
        unit={unit}
        onChange={(t, u) => {
          setText(t)
          setUnit(u)
        }}
      />
      <output data-testid="grams">{grams ?? ''}</output>
    </>
  )
}

beforeEach(() => window.localStorage.clear())
afterEach(cleanup)

describe('WeightField', () => {
  it('converts 1500 g to 1,5 kg when the unit changes and keeps 1500 grams', () => {
    render(<Harness />)
    const input = screen.getByLabelText('Pes') as HTMLInputElement
    fireEvent.change(input, { target: { value: '1500' } })
    expect(screen.getByTestId('grams').textContent).toBe('1500')
    fireEvent.click(screen.getByRole('button', { name: 'kg' }))
    expect(input.value).toBe('1,5')
    expect(screen.getByTestId('grams').textContent).toBe('1500')
    expect(screen.getByText('= 1,5 kg')).toBeTruthy()
  })

  it('lets a typed unit win over the selector', () => {
    render(<Harness initialUnit="kg" />)
    fireEvent.change(screen.getByLabelText('Pes'), { target: { value: '750g' } })
    expect(screen.getByTestId('grams').textContent).toBe('750')
    expect(screen.getByText('= 750 g')).toBeTruthy()
  })

  it('remembers the last unit on the device', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'kg' }))
    expect(window.localStorage.getItem('pedidator.weightUnit')).toBe('kg')
  })

  it('flags an invalid value', () => {
    render(<Harness />)
    fireEvent.change(screen.getByLabelText('Pes'), { target: { value: '1,5' } })
    expect(screen.getByText('En grams, sense decimals')).toBeTruthy()
  })
})
