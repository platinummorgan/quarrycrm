import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
// Mock resend before importing the module under test so the module-level
// Resend client is created from the mocked constructor.
vi.mock('resend')
import * as authEmail from '../lib/auth-email'
import { Resend } from 'resend'

describe('auth-email', () => {
  let sendMock: any

  beforeEach(() => {
    sendMock = vi.fn()
    ;(Resend as any).mockImplementation(() => ({ emails: { send: sendMock } }))
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('forces URL origin to NEXTAUTH_URL and sends email', async () => {
    process.env.NEXTAUTH_URL = 'https://www.quarrycrm.com'
    sendMock.mockResolvedValue({ id: 'abc' })

    const res = await authEmail.sendMagicLinkEmail(
      'user@example.com',
      'https://preview.vercel.app/api/auth/callback?token=123'
    )

    expect(sendMock).toHaveBeenCalled()
    const args = sendMock.mock.calls[0][0]
    expect(args.to).toBe('user@example.com')
    expect(args.html).toContain('https://www.quarrycrm.com')
    expect(res).toHaveProperty('id')
  })

  it('throws when provider returns error', async () => {
    process.env.NEXTAUTH_URL = 'https://www.quarrycrm.com'
    sendMock.mockResolvedValue({ error: { message: 'oh no' } })

    await expect(
      authEmail.sendMagicLinkEmail(
        'user@example.com',
        'https://preview.vercel.app/api/auth/callback?token=123'
      )
    ).rejects.toThrow(/Email send failed/)
  })
})
