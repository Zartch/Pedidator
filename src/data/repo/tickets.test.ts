import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { closeSession, startSession } from '../session'
import {
  createTicket,
  deleteTicket,
  getTicket,
  markTicketPaid,
  markTicketUnpaid,
} from './tickets'

let n = 0
beforeEach(async () => {
  await startSession({
    companyId: `tic${n++}`,
    userId: 'u',
    syncEnabled: false,
  })
})
afterEach(closeSession)

describe('tickets repo', () => {
  it('creates unpaid, pays, unpays', async () => {
    const t = await createTicket({ customer: 'c', amountCents: 1250 })
    expect(t.paid).toBe(false)
    const paid = await markTicketPaid(t.id)
    expect(paid.paid).toBe(true)
    expect(paid.paidAt).toBeTruthy()
    expect((await markTicketUnpaid(t.id)).paid).toBe(false)
  })

  it('rejects non-integer amounts', () => {
    expect(() => createTicket({ customer: 'c', amountCents: 12.5 })).toThrow()
  })

  it('deleteTicket is a soft delete', async () => {
    const t = await createTicket({ customer: 'c', amountCents: 1 })
    await deleteTicket(t.id)
    expect(await getTicket(t.id)).toBeUndefined()
  })
})
