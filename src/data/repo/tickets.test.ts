import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { closeSession, requireSession, startSession } from '../session'
import { getBlob, putBlob } from './blobs'
import {
  createTicket,
  createTicketWithPhoto,
  deleteTicket,
  getTicket,
  markTicketPaid,
  markTicketUnpaid,
} from './tickets'

let n = 0
beforeEach(async () => {
  await startSession({
    companyId: `tic${n++}`,
    userId: 'u',
    syncEnabled: false,
  })
})
afterEach(closeSession)

describe('tickets repo', () => {
  it('creates unpaid, pays, unpays', async () => {
    const t = await createTicket({ customer: 'c', amountCents: 1250 })
    expect(t.paid).toBe(false)
    const paid = await markTicketPaid(t.id)
    expect(paid.paid).toBe(true)
    expect(paid.paidAt).toBeTruthy()
    expect((await markTicketUnpaid(t.id)).paid).toBe(false)
  })

  it('rejects non-integer amounts', () => {
    expect(() => createTicket({ customer: 'c', amountCents: 12.5 })).toThrow()
  })

  it('deleteTicket is a soft delete', async () => {
    const t = await createTicket({ customer: 'c', amountCents: 1 })
    await deleteTicket(t.id)
    expect(await getTicket(t.id)).toBeUndefined()
  })

  it('deleting a ticket removes its photo and thumbnail', async () => {
    const t = await createTicket({ customer: 'c', amountCents: 100 })
    const blob = new Blob(['x'], { type: 'image/jpeg' })
    await putBlob('tickets', t.id, 'photo', blob)
    await putBlob('tickets', t.id, 'thumb', blob)
    await deleteTicket(t.id)
    expect(await getBlob('tickets', t.id, 'photo')).toBeUndefined()
    expect(await getBlob('tickets', t.id, 'thumb')).toBeUndefined()
  })

  it('createTicketWithPhoto stores ticket and blobs, and leaves no ticket if a blob fails', async () => {
    const blob = new Blob(['x'], { type: 'image/jpeg' })
    const t = await createTicketWithPhoto(
      { customer: 'c', amountCents: 100 },
      { photo: blob, thumb: blob },
    )
    expect(await getBlob('tickets', t.id, 'thumb')).toBeDefined()

    const { db } = requireSession()
    const real = db.blobs.put.bind(db.blobs)
    let calls = 0
    db.blobs.put = ((...a: Parameters<typeof real>) =>
      ++calls === 2 ? Promise.reject(new Error('quota')) : real(...a)) as typeof real
    await expect(
      createTicketWithPhoto({ customer: 'c', amountCents: 200 }, { photo: blob, thumb: blob }),
    ).rejects.toThrow()
    db.blobs.put = real
    expect(await db.tickets.count()).toBe(1)
  })
})
