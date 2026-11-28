import type { BlobRecord } from '../db'
import { requireSession } from '../session'

export type BlobKind = BlobRecord['kind']

function blobId(collection: string, recordId: string, kind: BlobKind): string {
  return `${collection}:${recordId}:${kind}`
}

/** Local-only store (never queued in the outbox): pending photos and cached thumbnails. */
export async function putBlob(
  collection: string,
  recordId: string,
  kind: BlobKind,
  blob: Blob,
): Promise<void> {
  const { db } = requireSession()
  await db.blobs.put({
    id: blobId(collection, recordId, kind),
    collection,
    recordId,
    kind,
    blob,
    createdAt: new Date().toISOString(),
  })
}

export async function getBlob(
  collection: string,
  recordId: string,
  kind: BlobKind,
): Promise<Blob | undefined> {
  const { db } = requireSession()
  return (await db.blobs.get(blobId(collection, recordId, kind)))?.blob
}

export async function deleteBlob(
  collection: string,
  recordId: string,
  kind: BlobKind,
): Promise<void> {
  const { db } = requireSession()
  await db.blobs.delete(blobId(collection, recordId, kind))
}

/** Photos waiting to be uploaded; photos of deleted (or missing) tickets are skipped. */
export async function listPendingPhotos(): Promise<BlobRecord[]> {
  const { db } = requireSession()
  const photos = await db.blobs.filter((b) => b.kind === 'photo').toArray()
  const live = new Set<string>()
  for (const b of photos) {
    if (b.collection !== 'tickets') continue
    const ticket = await db.tickets.get(b.recordId)
    if (ticket && !ticket.deleted) live.add(b.recordId)
  }
  return photos.filter((b) => b.collection !== 'tickets' || live.has(b.recordId))
}
