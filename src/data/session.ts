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

type Session = { db: PedidatorDb; ctx: SessionContext }

let current: Session | null = null
const listeners = new Set<() => void>()

function setCurrent(next: Session | null): void {
  current = next
  for (const cb of [...listeners]) cb()
}

/** Calls `cb` whenever the session starts, changes or closes. Returns the unsubscribe function. */
export function subscribeSession(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

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
  const session = { db, ctx }
  setCurrent(session)
  return session
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
  if (!current) return
  current.db.close()
  setCurrent(null)
}

export function getSession(): { db: PedidatorDb; ctx: SessionContext } | null {
  return current
}

export function requireSession(): { db: PedidatorDb; ctx: SessionContext } {
  const s = getSession()
  if (!s) throw new Error('No active session: call startSession first')
  return s
}
