import { newId } from '@/lib/id'
import { openCompanyDb, type PedidatorDb } from './db'

export type SessionContext = {
  companyId: string
  userId: string
  deviceId: string
  syncEnabled: boolean
}

export const DEMO_COMPANY_ID = 'demo'
export const DEMO_USER_ID = 'demo-user'

let currentDb: PedidatorDb | null = null
let currentCtx: SessionContext | null = null

/** Device id stored in `meta`; created once per company database. */
export async function ensureDeviceId(db: PedidatorDb): Promise<string> {
  const row = await db.meta.get('deviceId')
  if (typeof row?.value === 'string') return row.value
  const id = newId()
  await db.meta.put({ key: 'deviceId', value: id })
  return id
}

/** Opens the company database and makes it the current session. */
export async function startSession(
  input: Omit<SessionContext, 'deviceId'> & { deviceId?: string },
): Promise<{ db: PedidatorDb; ctx: SessionContext }> {
  closeSession()
  const db = openCompanyDb(input.companyId)
  const deviceId = input.deviceId ?? (await ensureDeviceId(db))
  const ctx: SessionContext = { ...input, deviceId }
  currentDb = db
  currentCtx = ctx
  return { db, ctx }
}

/** Demo mode: company `demo`, no synchronisation. */
export function startDemoSession() {
  return startSession({
    companyId: DEMO_COMPANY_ID,
    userId: DEMO_USER_ID,
    syncEnabled: false,
  })
}

export function closeSession(): void {
  currentDb?.close()
  currentDb = null
  currentCtx = null
}

export function getSession(): { db: PedidatorDb; ctx: SessionContext } | null {
  return currentDb && currentCtx ? { db: currentDb, ctx: currentCtx } : null
}

export function requireSession(): { db: PedidatorDb; ctx: SessionContext } {
  const s = getSession()
  if (!s) throw new Error('No active session: call startSession first')
  return s
}
