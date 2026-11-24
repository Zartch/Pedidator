import type { Ticket } from '@shared/types'
import { create, update, softDelete, writeTables } from '../mutate'
import { deleteBlob, putBlob } from './blobs'
import { requireSession } from '../session'

export type TicketFields = {
  customer: string
  amountCents: number
  notes?: string
}

export async function getTicket(id: string): Promise<Ticket | undefined> {
  const { db } = requireSession()
  const t = await db.tickets.get(id)
  return t && !t.deleted ? t : undefined
}

export function createTicket(fields: TicketFields): Promise<Ticket> {
  const { db, ctx } = requireSession()
  if (!Number.isSafeInteger(fields.amountCents))
    throw new Error('amountCents must be an integer')
  return create(db, ctx, 'tickets', {
    customer: fields.customer,
    amountCents: fields.amountCents,
    notes: fields.notes?.trim() ?? '',
    paid: false,
  })
}

export function updateTicket(
  id: string,
  fields: Partial<TicketFields>,
): Promise<Ticket> {
  const { db, ctx } = requireSession()
  if (
    fields.amountCents !== undefined &&
    !Number.isSafeInteger(fields.amountCents)
  ) {
    throw new Error('amountCents must be an integer')
  }
  const patch = { ...fields }
  if (patch.notes !== undefined) patch.notes = patch.notes.trim()
  return update(db, ctx, 'tickets', id, patch)
}

export function markTicketPaid(id: string): Promise<Ticket> {
  const { db, ctx } = requireSession()
  return update(db, ctx, 'tickets', id, {
    paid: true,
    paidAt: new Date().toISOString(),
  })
}

export function markTicketUnpaid(id: string): Promise<Ticket> {
  const { db, ctx } = requireSession()
  return update(db, ctx, 'tickets', id, { paid: false, paidAt: '' })
}

/**
 * Creates a ticket and stores its photo and thumbnail in one transaction
 * (blobs are local only): if saving the photo fails, no ticket is left behind.
 */
export function createTicketWithPhoto(
  fields: TicketFields,
  images: { photo: Blob; thumb: Blob },
): Promise<Ticket> {
  const { db } = requireSession()
  return db.transaction('rw', [...writeTables(db), db.blobs], async () => {
    const ticket = await createTicket(fields)
    await putBlob('tickets', ticket.id, 'photo', images.photo)
    await putBlob('tickets', ticket.id, 'thumb', images.thumb)
    return ticket
  })
}

/** Soft-deletes the ticket and drops its local photo blobs. */
export async function deleteTicket(id: string): Promise<void> {
  const { db, ctx } = requireSession()
  await db.transaction('rw', [...writeTables(db), db.blobs], async () => {
    await softDelete(db, ctx, 'tickets', id)
    await deleteBlob('tickets', id, 'photo')
    await deleteBlob('tickets', id, 'thumb')
  })
}
