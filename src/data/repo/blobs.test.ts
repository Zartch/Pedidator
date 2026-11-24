import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { closeSession, requireSession, startSession } from '../session'
import { createTicket, deleteTicket } from './tickets'
import { deleteBlob, getBlob, listPendingPhotos, putBlob } from './blobs'

let n = 0
beforeEach(async () => {
  await startSession({ companyId: `blo${n++}`, userId: 'u', syncEnabled: true })
})
afterEach(closeSession)

describe('blobs repo', () => {
  it('stores, reads, lists and deletes without touching the outbox', async () => {
    const blob = new Blob(['abc'], { type: 'image/jpeg' })
    const t = await createTicket({ customer: 'c', amountCents: 100 })
    await requireSession().db.outbox.clear()
    await putBlob('tickets', t.id, 'photo', blob)
    await putBlob('tickets', t.id, 'thumb', blob)
    expect(await getBlob('tickets', t.id, 'photo')).toBeDefined()
    expect(await listPendingPhotos()).toHaveLength(1)
    await deleteBlob('tickets', t.id, 'photo')
    expect(await getBlob('tickets', t.id, 'photo')).toBeUndefined()
    expect(await requireSession().db.outbox.count()).toBe(0)
  })

  it('does not list photos of deleted tickets', async () => {
    const blob = new Blob(['abc'], { type: 'image/jpeg' })
    const t = await createTicket({ customer: 'c', amountCents: 100 })
    await putBlob('tickets', t.id, 'photo', blob)
    // A stale blob whose ticket is gone is skipped as well.
    await putBlob('tickets', 'orphan', 'photo', blob)
    expect((await listPendingPhotos()).map((b) => b.recordId)).toEqual([t.id])
    await deleteTicket(t.id)
    expect(await listPendingPhotos()).toEqual([])
  })
})
