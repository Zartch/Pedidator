import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SafeForm } from './SafeForm'

function setup() {
  const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())
  render(
    <SafeForm onSubmit={onSubmit}>
      <label>
        Nom <input />
      </label>
      <label>
        Notes <textarea />
      </label>
      <button type="submit">Guardar</button>
    </SafeForm>,
  )
  return { onSubmit }
}

describe('SafeForm', () => {
  afterEach(cleanup)

  it('Enter in a field does not submit the form', () => {
    const { onSubmit } = setup()
    const input = screen.getByLabelText(/Nom/)
    const notPrevented = fireEvent.keyDown(input, { key: 'Enter' })
    expect(notPrevented).toBe(false)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('Enter in a textarea keeps its default (line break)', () => {
    setup()
    const notes = screen.getByLabelText(/Notes/)
    expect(fireEvent.keyDown(notes, { key: 'Enter' })).toBe(true)
  })

  it('other keys are not touched', () => {
    setup()
    expect(fireEvent.keyDown(screen.getByLabelText(/Nom/), { key: 'a' })).toBe(true)
  })

  it('the explicit submit button still submits', () => {
    const { onSubmit } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(onSubmit).toHaveBeenCalled()
  })
})
