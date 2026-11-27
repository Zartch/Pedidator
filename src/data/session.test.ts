import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { dbName } from './db'
import {
  closeSession,
  getSession,
  requireSession,
  startDemoSession,
  startSession,
  subscribeSession,
} from './session'

afterEach(closeSession)

describe('session', () => {
  it('demo session: company demo, sync disabled, stable device id', async () => {
    const { ctx, db } = await startDemoSession()
    expect(ctx.companyId).toBe('demo')
    expect(ctx.syncEnabled).toBe(false)
    expect(db.name).toBe(dbName('demo'))
    expect(ctx.deviceId).toMatch(/^[a-z0-9]{15}$/)
    closeSession()
    const again = await startDemoSession()
    expect(again.ctx.deviceId).toBe(ctx.deviceId)
  })

  it('uses one database per company', async () => {
    const a = await startSession({
      companyId: 'ca1',
      userId: 'u',
      syncEnabled: false,
    })
    await a.db.meta.put({ key: 'x', value: 1 })
    const b = await startSession({
      companyId: 'cb2',
      userId: 'u',
      syncEnabled: false,
    })
    expect(b.db.name).toBe('pedidator-cb2')
    expect(await b.db.meta.get('x')).toBeUndefined()
  })

  it('requireSession throws without a session', () => {
    expect(getSession()).toBeNull()
    expect(() => requireSession()).toThrow()
  })

  it('opens all tables', async () => {
    const { db } = await startDemoSession()
    expect(db.tables.map((t) => t.name).sort()).toEqual([
      'blobs',
      'conflicts',
      'customers',
      'meta',
      'order_items',
      'orders',
      'outbox',
      'products',
      'tickets',
    ])
  })

  it('subscribeSession notifies on start, change and close, and unsubscribes', async () => {
    let calls = 0
    const off = subscribeSession(() => calls++)
    await startSession({ companyId: 'sub1', userId: 'u', syncEnabled: false })
    const afterStart = calls
    expect(afterStart).toBeGreaterThan(0)
    await startSession({ companyId: 'sub2', userId: 'u', syncEnabled: false })
    expect(calls).toBeGreaterThan(afterStart)
    const beforeClose = calls
    closeSession()
    expect(calls).toBe(beforeClose + 1)
    off()
    await startSession({ companyId: 'sub3', userId: 'u', syncEnabled: false })
    expect(calls).toBe(beforeClose + 1)
  })
})
