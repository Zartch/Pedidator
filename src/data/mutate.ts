/**
 * The only write path to Dexie for synchronisable collections (CLAUDE.md rule 1).
 * Every change is applied locally and, when `syncEnabled`, queued in the outbox
 * inside the same Dexie transaction (SPEC 4.2).
 */
import type {
  Base,
  CollectionName,
  Customer,
  Order,
  OrderItem,
  Ticket,
} from '@shared/types'
import { newId } from '@/lib/id'
import type { OutboxOp, PedidatorDb } from './db'
import type { SessionContext } from './session'

export type RecordOf = {
  customers: Customer
  orders: Order
  order_items: OrderItem
  tickets: Ticket
}

/** Input for `create`: business fields only; Base fields are filled in here. */
export type CreateInput<C extends CollectionName> = Omit<
  RecordOf[C],
  keyof Base
> & { id?: string }

/** Fields only the server writes: applied locally, never sent in a patch. */
const SERVER_FIELDS = new Set([
  'id',
  'company',
  'version',
  'updatedBy',
  'deleted',
  'created',
  'updated',
  'nameKey',
])

function sameValue(a: unknown, b: unknown): boolean {
  return Object.is(a, b) || JSON.stringify(a) === JSON.stringify(b)
}

function serverPatch(fields: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fields).filter(([k]) => !SERVER_FIELDS.has(k)),
  )
}

function writeTables(db: PedidatorDb) {
  return [db.customers, db.orders, db.order_items, db.tickets, db.outbox]
}

/** Runs `fn` in one read-write transaction over every syncable table and the outbox. */
export function writeTx<T>(db: PedidatorDb, fn: () => Promise<T>): Promise<T> {
  return db.transaction('rw', writeTables(db), fn)
}

function newOp(
  ctx: SessionContext,
  collection: string,
  recordId: string,
  kind: OutboxOp['kind'],
  baseVersion: number | null,
  patch: Record<string, unknown>,
  baseValues: Record<string, unknown>,
): OutboxOp {
  return {
    opId: crypto.randomUUID(),
    company: ctx.companyId,
    collection,
    recordId,
    kind,
    baseVersion,
    patch,
    baseValues,
    createdAt: new Date().toISOString(),
    deviceId: ctx.deviceId,
    userId: ctx.userId,
  }
}

function existingOp(db: PedidatorDb, collection: string, recordId: string) {
  return db.outbox
    .where('[collection+recordId]')
    .equals([collection, recordId])
    .first()
}

export async function create<C extends CollectionName>(
  db: PedidatorDb,
  ctx: SessionContext,
  collection: C,
  data: CreateInput<C>,
): Promise<RecordOf[C]> {
  return writeTx(db, async () => {
    const now = new Date().toISOString()
    const record = {
      ...data,
      id: data.id ?? newId(),
      company: ctx.companyId,
      version: 0,
      updatedBy: ctx.userId,
      deleted: false,
      created: now,
      updated: now,
    } as unknown as RecordOf[C]
    await db.table(collection).add(record)
    if (ctx.syncEnabled) {
      await db.outbox.add(
        newOp(
          ctx,
          collection,
          record.id,
          'create',
          null,
          serverPatch(record),
          {},
        ),
      )
    }
    return record
  })
}

export async function update<C extends CollectionName>(
  db: PedidatorDb,
  ctx: SessionContext,
  collection: C,
  id: string,
  patch: Partial<Omit<RecordOf[C], keyof Base>> & { nameKey?: string },
): Promise<RecordOf[C]> {
  return writeTx(db, async () => {
    const table = db.table(collection)
    const current = (await table.get(id)) as RecordOf[C] | undefined
    if (!current || current.deleted)
      throw new Error(`${collection}/${id} not found`)
    const old = current as unknown as Record<string, unknown>

    const changed: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(patch)) {
      if (v !== undefined && !sameValue(old[k], v)) changed[k] = v
    }
    if (Object.keys(changed).length === 0) return current
    await table.update(id, changed)

    if (ctx.syncEnabled) {
      const sent = serverPatch(changed)
      if (Object.keys(sent).length > 0) {
        const prior = Object.fromEntries(
          Object.keys(sent).map((k) => [k, old[k] ?? null]),
        )
        const op = await existingOp(db, collection, id)
        if (!op) {
          await db.outbox.add(
            newOp(ctx, collection, id, 'update', current.version, sent, prior),
          )
        } else if (op.kind === 'create') {
          await db.outbox.update(op.opId, { patch: { ...op.patch, ...sent } })
        } else if (op.kind === 'update') {
          const baseValues = { ...prior, ...op.baseValues }
          const merged = { ...op.patch, ...sent }
          // Fields edited back to their original value are no longer changes.
          for (const k of Object.keys(merged)) {
            if (sameValue(merged[k], baseValues[k])) {
              delete merged[k]
              delete baseValues[k]
            }
          }
          if (Object.keys(merged).length === 0) await db.outbox.delete(op.opId)
          else await db.outbox.update(op.opId, { patch: merged, baseValues })
        } else {
          throw new Error(`${collection}/${id} has a pending delete`)
        }
      }
    }
    return (await table.get(id)) as RecordOf[C]
  })
}

export type SoftDeleteOptions = {
  /**
   * Mark deleted locally and drop any pending ops for the record without
   * queueing a delete. Used for order items when their order is deleted: the
   * server cascades the delete itself (SPEC 3 `orders`, 4.3).
   */
  skipOutbox?: boolean
}

export async function softDelete<C extends CollectionName>(
  db: PedidatorDb,
  ctx: SessionContext,
  collection: C,
  id: string,
  options: SoftDeleteOptions = {},
): Promise<void> {
  await writeTx(db, async () => {
    const table = db.table(collection)
    const current = (await table.get(id)) as RecordOf[C] | undefined
    if (!current || current.deleted) return
    await table.update(id, { deleted: true })
    if (!ctx.syncEnabled) return

    const op = await existingOp(db, collection, id)
    if (op?.kind === 'create') {
      // Never uploaded: the server never needs to hear about it.
      await db.outbox.delete(op.opId)
      return
    }
    if (options.skipOutbox) {
      if (op) await db.outbox.delete(op.opId)
      return
    }
    if (op) await db.outbox.delete(op.opId)
    await db.outbox.add(
      newOp(
        ctx,
        collection,
        id,
        'delete',
        op?.baseVersion ?? current.version,
        {},
        {},
      ),
    )
  })
}
