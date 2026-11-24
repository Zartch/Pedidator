import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { closeSession, requireSession, startSession } from '../session'
import { deleteBlob, getBlob, listPendingPhotos, putBlob } from './blobs'

let n = 0
beforeEach(async () => {
  await startSession({ companyId: `blo${n++}`, userId: 'u', syncEnabled: true })
})
afterEach(closeSession)

describe('blobs repo', () => {
  it('stores, reads, lists and deletes without touching the outbox', async () => {
    const blob = new Blob(['abc'], { type: 'image/jpeg' })
    await putBlob('tickets', 't1', 'photo', blob)
    await putBlob('tickets', 't1', 'thumb', blob)
    expect(await getBlob('tickets', 't1', 'photo')).toBeDefined()
    expect(await listPendingPhotos()).toHaveLength(1)
    await deleteBlob('tickets', 't1', 'photo')
    expect(await getBlob('tickets', 't1', 'photo')).toBeUndefined()
    expect(await requireSession().db.outbox.count()).toBe(0)
  })
})
