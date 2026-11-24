import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { PedidatorDb } from './db'
import { create, softDelete, update } from './mutate'
import { closeSession, startSession, type SessionContext } from './session'

let db: PedidatorDb
let ctx: SessionContext
let n = 0

beforeEach(async () => {
  ;({ db, ctx } = await startSession({
    companyId: `mut${n++}`,
    userId: 'u1',
    syncEnabled: true,
  }))
})
afterEach(async () => {
  closeSession()
})

const newTicket = (amountCents = 100) =>
  create(db, ctx, 'tickets', {
    customer: 'c1',
    amountCents,
    notes: '',
    paid: false,
  })

/** Simulates a record already acknowledged by the server. */
async function asUploaded(id: string, version = 3) {
  await db.outbox.clear()
  await db.tickets.update(id, { version })
}

describe('create', () => {
  it('stores the record and queues a create op without server fields', async () => {
    const t = await newTicket()
    expect(t.id).toMatch(/^[a-z0-9]{15}$/)
    expect(t.company).toBe(ctx.companyId)
    expect(t.deleted).toBe(false)
    const ops = await db.outbox.toArray()
    expect(ops).toHaveLength(1)
    expect(ops[0]).toMatchObject({
      kind: 'create',
      collection: 'tickets',
      recordId: t.id,
      baseVersion: null,
      company: ctx.companyId,
      deviceId: ctx.deviceId,
      userId: 'u1',
    })
    expect(ops[0].patch).toEqual({
      customer: 'c1',
      amountCents: 100,
      notes: '',
      paid: false,
    })
    expect(ops[0].baseValues).toEqual({})
  })

  it('never sends nameKey in the patch but keeps it locally', async () => {
    const c = await create(db, ctx, 'customers', {
      name: 'Ana',
      nameKey: 'ana',
    })
    expect((await db.customers.get(c.id))?.nameKey).toBe('ana')
    expect((await db.outbox.toArray())[0].patch).toEqual({ name: 'Ana' })
  })

  it('does not touch the outbox when sync is disabled', async () => {
    const off = { ...ctx, syncEnabled: false }
    await create(db, off, 'tickets', {
      customer: 'c',
      amountCents: 1,
      notes: '',
      paid: false,
    })
    expect(await db.outbox.count()).toBe(0)
    expect(await db.tickets.count()).toBe(1)
  })
})

describe('update merging', () => {
  it('update on update merges patches and keeps the original base', async () => {
    const t = await newTicket()
    await asUploaded(t.id)
    await update(db, ctx, 'tickets', t.id, { amountCents: 200 })
    await update(db, ctx, 'tickets', t.id, { amountCents: 300, notes: 'x' })
    const ops = await db.outbox.toArray()
    expect(ops).toHaveLength(1)
    expect(ops[0]).toMatchObject({ kind: 'update', baseVersion: 3 })
    expect(ops[0].patch).toEqual({ amountCents: 300, notes: 'x' })
    expect(ops[0].baseValues).toEqual({ amountCents: 100, notes: '' })
    expect((await db.tickets.get(t.id))?.amountCents).toBe(300)
  })

  it('update on create folds into the create', async () => {
    const t = await newTicket()
    await update(db, ctx, 'tickets', t.id, { amountCents: 999 })
    const ops = await db.outbox.toArray()
    expect(ops).toHaveLength(1)
    expect(ops[0]).toMatchObject({ kind: 'create', baseVersion: null })
    expect(ops[0].patch.amountCents).toBe(999)
  })

  it('editing a field back to its original value drops it from the op', async () => {
    const t = await newTicket()
    await asUploaded(t.id)
    await update(db, ctx, 'tickets', t.id, { amountCents: 200 })
    await update(db, ctx, 'tickets', t.id, { amountCents: 100 })
    expect(await db.outbox.count()).toBe(0)
  })

  it('a no-op update writes nothing', async () => {
    const t = await newTicket()
    await asUploaded(t.id)
    await update(db, ctx, 'tickets', t.id, { amountCents: 100 })
    expect(await db.outbox.count()).toBe(0)
  })

  it('separate records get separate ops', async () => {
    const a = await newTicket()
    const b = await newTicket()
    await asUploaded(a.id)
    await update(db, ctx, 'tickets', a.id, { paid: true })
    await update(db, ctx, 'tickets', b.id, { paid: true })
    expect(await db.outbox.count()).toBe(2)
  })

  it('rejects updates to a missing or deleted record', async () => {
    await expect(
      update(db, ctx, 'tickets', 'nope', { paid: true }),
    ).rejects.toThrow()
  })
})

describe('softDelete merging', () => {
  it('delete on create removes both and queues nothing', async () => {
    const t = await newTicket()
    await softDelete(db, ctx, 'tickets', t.id)
    expect(await db.outbox.count()).toBe(0)
    expect((await db.tickets.get(t.id))?.deleted).toBe(true)
  })

  it('delete on update replaces it with a delete keeping baseVersion', async () => {
    const t = await newTicket()
    await asUploaded(t.id, 5)
    await update(db, ctx, 'tickets', t.id, { amountCents: 7 })
    await softDelete(db, ctx, 'tickets', t.id)
    const ops = await db.outbox.toArray()
    expect(ops).toHaveLength(1)
    expect(ops[0]).toMatchObject({
      kind: 'delete',
      baseVersion: 5,
      patch: {},
      baseValues: {},
    })
  })

  it('delete on an uploaded record queues a delete with its version', async () => {
    const t = await newTicket()
    await asUploaded(t.id, 2)
    await softDelete(db, ctx, 'tickets', t.id)
    const ops = await db.outbox.toArray()
    expect(ops).toHaveLength(1)
    expect(ops[0]).toMatchObject({ kind: 'delete', baseVersion: 2 })
    expect((await db.tickets.get(t.id))?.deleted).toBe(true)
  })

  it('skipOutbox drops pending ops without queueing a delete', async () => {
    const t = await newTicket()
    await asUploaded(t.id)
    await update(db, ctx, 'tickets', t.id, { paid: true })
    await softDelete(db, ctx, 'tickets', t.id, { skipOutbox: true })
    expect(await db.outbox.count()).toBe(0)
  })

  it('updating after delete is rejected', async () => {
    const t = await newTicket()
    await softDelete(db, ctx, 'tickets', t.id)
    await expect(
      update(db, ctx, 'tickets', t.id, { paid: true }),
    ).rejects.toThrow()
  })
})
