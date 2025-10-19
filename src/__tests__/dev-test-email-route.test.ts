import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '../app/api/dev/test-email/route'
import * as authEmail from '../lib/auth-email'

vi.mock('@/lib/auth-email')

describe('/api/dev/test-email', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns 400 when missing email', async () => {
    const req = new Request('https://localhost/api/dev/test-email', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    // Call the route handler
    // The route expects NextRequest, but our function signature takes NextRequest; for unit test we call POST as exported
    const res = await POST(req as any)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('Email is required')
  })

  it('returns 200 on success', async () => {
    ;(authEmail.sendMagicLinkEmail as any).mockResolvedValue({ id: 'ok' })
    const req = new Request('https://localhost/api/dev/test-email', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@example.com' }),
    })
    const res: any = await POST(req as any)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.message).toBe('Test email sent successfully')
  })

  it('returns 500 on send error', async () => {
    ;(authEmail.sendMagicLinkEmail as any).mockRejectedValue(
      new Error('send failed')
    )
    const req = new Request('https://localhost/api/dev/test-email', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@example.com' }),
    })
    const res: any = await POST(req as any)
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.error).toContain('send failed')
  })
})
