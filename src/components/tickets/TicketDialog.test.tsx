import 'fake-indexeddb/auto'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { closeSession, requireSession, startSession } from '@/data/session'
import { TicketDialog } from './TicketDialog'

vi.mock('@/lib/photo', () => ({
  preparePhoto: async () => ({
    photo: new Blob(['p'], { type: 'image/jpeg' }),
    thumb: new Blob(['t'], { type: 'image/jpeg' }),
  }),
}))

let n = 0
beforeEach(async () => {
  URL.createObjectURL = () => 'blob:x'
  URL.revokeObjectURL = () => {}
  await startSession({ companyId: `tdl${n++}`, userId: 'u1', syncEnabled: false })
})
afterEach(() => {
  cleanup()
  closeSession()
})

describe('TicketDialog', () => {
  it('a failed photo save leaves no ticket behind, so retrying does not duplicate it', async () => {
    const onClose = vi.fn()
    render(
      <MemoryRouter>
        <TicketDialog onClose={onClose} />
      </MemoryRouter>,
    )
    const { db } = requireSession()
    const real = db.blobs.put.bind(db.blobs)
    let fail = true
    db.blobs.put = ((...a: Parameters<typeof real>) =>
      fail ? Promise.reject(new Error('quota')) : real(...a)) as typeof real

    fireEvent.change(await screen.findByLabelText('Client'), { target: { value: 'Núria' } })
    fireEvent.change(screen.getByLabelText('Import'), { target: { value: '10' } })
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    fireEvent.change(screen.getByTestId('ticket-gallery'), { target: { files: [file] } })
    const saveButton = () => screen.getByRole('button', { name: 'Desa' })

    fireEvent.click(saveButton())
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(onClose).not.toHaveBeenCalled()
    expect(await db.tickets.count()).toBe(0)

    fail = false
    fireEvent.click(saveButton())
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(await db.tickets.count()).toBe(1)
    expect(await db.blobs.count()).toBe(2)
  })
})
