import Dexie, { type EntityTable } from 'dexie'
import type {
  Customer,
  Order,
  OrderItem,
  Product,
  Ticket,
} from '@shared/types'

/**
 * Pending local change (SPEC 4.2). Defined here until F2-3 moves it to
 * shared/sync; the shape follows the spec to the letter.
 */
export type OutboxOp = {
  opId: string
  company: string
  collection: string
  recordId: string
  kind: 'create' | 'update' | 'delete'
  baseVersion: number | null
  patch: Record<string, unknown>
  baseValues: Record<string, unknown>
  force?: boolean
  createdAt: string
  deviceId: string
  userId: string
}

/** Operation parked until the user resolves it (SPEC 4.4). Filled by the sync engine. */
export type ConflictRecord = {
  opId: string
  collection: string
  recordId: string
  type: 'fields' | 'deleted_on_server' | 'modified_on_server'
  op: OutboxOp
  server: Record<string, unknown> | null
  fields: string[]
  updatedByName?: string
  serverUpdated?: string
  createdAt: string
}

/** Pending photo upload or cached thumbnail. `id` = `${collection}:${recordId}:${kind}`. */
export type BlobRecord = {
  id: string
  collection: string
  recordId: string
  kind: 'photo' | 'thumb'
  blob: Blob
  createdAt: string
}

/** Key/value local metadata: lastSyncAt, cursor:{collection}, deviceId, user. */
export type MetaRecord = { key: string; value: unknown }

export type PedidatorDb = Dexie & {
  customers: EntityTable<Customer, 'id'>
  products: EntityTable<Product, 'id'>
  orders: EntityTable<Order, 'id'>
  order_items: EntityTable<OrderItem, 'id'>
  tickets: EntityTable<Ticket, 'id'>
  outbox: EntityTable<OutboxOp, 'opId'>
  conflicts: EntityTable<ConflictRecord, 'opId'>
  blobs: EntityTable<BlobRecord, 'id'>
  meta: EntityTable<MetaRecord, 'key'>
}

export function dbName(companyId: string): string {
  return `pedidator-${companyId}`
}

/** One Dexie database per company (CLAUDE.md rule 6). */
export function openCompanyDb(companyId: string): PedidatorDb {
  const db = new Dexie(dbName(companyId)) as PedidatorDb
  db.version(1).stores({
    customers: 'id, nameKey',
    orders: 'id, pickupAt, status, customer',
    order_items: 'id, order',
    tickets: 'id, customer, paid',
    outbox: 'opId, createdAt, [collection+recordId]',
    conflicts: 'opId',
    blobs: 'id, [collection+recordId]',
    meta: 'key',
  })
  db.version(2).stores({ products: 'id, nameKey' })
  return db
}
