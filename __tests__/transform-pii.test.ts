/**
 * Server-side PII Transformer Tests
 * 
 * Tests for server-side data transformation utilities
 */

import { describe, it, expect } from 'vitest'
import type { Session } from 'next-auth'
import {
  transformContact,
  transformContacts,
  transformCompany,
  transformCompanies,
  transformActivity,
  transformActivities,
  transformDeal,
  transformDeals,
  transformData,
  transformResponse,
  getMaskingStatus,
} from '@/lib/server/transform-pii'

describe('Transform Contact', () => {
  it('should mask contact for demo session', () => {
    const session: any = {
      user: { isDemo: true },
    }

    const contact = {
      id: 'contact-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '(404) 555-9231',
    }

    const result = transformContact(contact, session)
    expect(result.email).toBe('j***@example.com')
    expect(result.phone).toBe('***-***-9231')
    expect(result.firstName).toBe('John')
  })

  it('should not mask contact for regular session', () => {
    const session: any = {
      user: { isDemo: false, currentOrg: { role: 'MEMBER' } },
    }

    const contact = {
      id: 'contact-1',
      email: 'john@example.com',
      phone: '404-555-9231',
    }

    const result = transformContact(contact, session)
    expect(result.email).toBe('john@example.com')
    expect(result.phone).toBe('404-555-9231')
  })

  it('should not mask for null session', () => {
    const contact = {
      id: 'contact-1',
      email: 'john@example.com',
      phone: '404-555-9231',
    }

    const result = transformContact(contact, null)
    expect(result.email).toBe('john@example.com')
  })
})

describe('Transform Contacts Array', () => {
  it('should mask all contacts for demo session', () => {
    const session: any = {
      user: { currentOrg: { role: 'DEMO' } },
    }

    const contacts = [
      { id: '1', email: 'john@example.com', phone: '404-555-9231' },
      { id: '2', email: 'jane@example.com', phone: '404-555-9232' },
    ]

    const result = transformContacts(contacts, session)
    expect(result[0].email).toBe('j***@example.com')
    expect(result[0].phone).toBe('***-***-9231')
    expect(result[1].email).toBe('j***@example.com')
    expect(result[1].phone).toBe('***-***-9231')
  })

  it('should not mask for regular session', () => {
    const session: any = {
      user: { isDemo: false, currentOrg: { role: 'MEMBER' } },
    }

    const contacts = [
      { id: '1', email: 'john@example.com', phone: '404-555-9231' },
    ]

    const result = transformContacts(contacts, session)
    expect(result[0].email).toBe('john@example.com')
  })
})

describe('Transform Company', () => {
  it('should mask company for demo session', () => {
    const session: any = {
      user: { isDemo: true },
    }

    const company = {
      id: 'company-1',
      name: 'Acme Corp',
      email: 'contact@acme.com',
      phone: '(404) 555-1234',
      website: 'acme.com',
    }

    const result = transformCompany(company, session)
    expect(result.email).toBe('c***@acme.com')
    expect(result.phone).toBe('***-***-9231')
    expect(result.name).toBe('Acme Corp')
  })

  it('should not mask company for regular session', () => {
    const session: any = {
      user: { isDemo: false },
    }

    const company = {
      id: 'company-1',
      email: 'contact@acme.com',
      phone: '404-555-1234',
    }

    const result = transformCompany(company, session)
    expect(result.email).toBe('contact@acme.com')
  })
})

describe('Transform Companies Array', () => {
  it('should mask all companies for demo session', () => {
    const session: any = {
      user: { isDemo: true },
    }

    const companies = [
      { id: '1', name: 'Acme', email: 'contact@acme.com', phone: '404-555-1234' },
      { id: '2', name: 'Beta', email: 'info@beta.com', phone: '404-555-5678' },
    ]

    const result = transformCompanies(companies, session)
    expect(result[0].email).toBe('c***@acme.com')
    expect(result[1].email).toBe('i***@beta.com')
  })
})

describe('Transform Activity', () => {
  it('should mask activity with contact info', () => {
    const session: any = {
      user: { isDemo: true },
    }

    const activity = {
      id: 'activity-1',
      type: 'EMAIL',
      subject: 'Follow up',
      email: 'contact@example.com',
      phone: '404-555-9231',
    }

    const result = transformActivity(activity, session)
    expect(result.email).toBe('c***@example.com')
    expect(result.phone).toBe('***-***-9231')
    expect(result.subject).toBe('Follow up')
  })

  it('should handle activity without PII', () => {
    const session: any = {
      user: { isDemo: true },
    }

    const activity = {
      id: 'activity-1',
      type: 'NOTE',
      subject: 'Meeting notes',
    }

    const result = transformActivity(activity, session)
    expect(result.subject).toBe('Meeting notes')
  })
})

describe('Transform Activities Array', () => {
  it('should mask all activities for demo session', () => {
    const session: any = {
      user: { isDemo: true },
    }

    const activities = [
      { id: '1', type: 'EMAIL', contactEmail: 'john@example.com' },
      { id: '2', type: 'CALL', contactPhone: '404-555-9231' },
    ]

    const result = transformActivities(activities, session)
    expect(result[0].contactEmail).toBe('j***@example.com')
    expect(result[1].contactPhone).toBe('***-***-9231')
  })
})

describe('Transform Deal', () => {
  it('should mask nested contact and company', () => {
    const session: any = {
      user: { isDemo: true },
    }

    const deal = {
      id: 'deal-1',
      title: 'Big Sale',
      value: 10000,
      contact: {
        id: 'contact-1',
        email: 'john@example.com',
        phone: '404-555-9231',
      },
      company: {
        id: 'company-1',
        email: 'contact@acme.com',
        phone: '404-555-1234',
      },
    }

    const result = transformDeal(deal, session)
    expect(result.contact?.email).toBe('j***@example.com')
    expect(result.contact?.phone).toBe('***-***-9231')
    expect(result.company?.email).toBe('c***@acme.com')
    expect(result.company?.phone).toBe('***-***-9231')
    expect(result.title).toBe('Big Sale')
  })

  it('should handle deal without nested data', () => {
    const session: any = {
      user: { isDemo: true },
    }

    const deal = {
      id: 'deal-1',
      title: 'Simple Deal',
      value: 5000,
    }

    const result = transformDeal(deal, session)
    expect(result.title).toBe('Simple Deal')
    expect(result.value).toBe(5000)
  })

  it('should not mask for regular session', () => {
    const session: any = {
      user: { isDemo: false },
    }

    const deal = {
      id: 'deal-1',
      contact: {
        id: 'contact-1',
        email: 'john@example.com',
        phone: '404-555-9231',
      },
    }

    const result = transformDeal(deal, session)
    expect(result.contact?.email).toBe('john@example.com')
  })
})

describe('Transform Deals Array', () => {
  it('should mask all deals with nested data', () => {
    const session: any = {
      user: { isDemo: true },
    }

    const deals = [
      {
        id: 'deal-1',
        contact: { id: 'c1', email: 'john@example.com', phone: '404-555-9231' },
      },
      {
        id: 'deal-2',
        company: { id: 'co1', email: 'info@acme.com', phone: '404-555-1234' },
      },
    ]

    const result = transformDeals(deals, session)
    expect(result[0].contact?.email).toBe('j***@example.com')
    expect(result[1].company?.email).toBe('i***@acme.com')
  })
})

describe('Transform Data (Generic)', () => {
  it('should handle arrays', () => {
    const session: any = {
      user: { isDemo: true },
    }

    const data = [
      { email: 'user1@example.com' },
      { email: 'user2@example.com' },
    ]

    const result = transformData(data, session)
    expect(result[0].email).toBe('u***@example.com')
    expect(result[1].email).toBe('u***@example.com')
  })

  it('should handle objects', () => {
    const session: any = {
      user: { isDemo: true },
    }

    const data = {
      email: 'user@example.com',
      phone: '404-555-9231',
    }

    const result = transformData(data, session)
    expect(result.email).toBe('u***@example.com')
    expect(result.phone).toBe('***-***-9231')
  })

  it('should handle primitives', () => {
    const session: any = {
      user: { isDemo: true },
    }

    expect(transformData('test', session)).toBe('test')
    expect(transformData(123, session)).toBe(123)
    expect(transformData(true, session)).toBe(true)
  })

  it('should handle nested arrays', () => {
    const session: any = {
      user: { isDemo: true },
    }

    const data = [
      [{ email: 'user1@example.com' }],
      [{ email: 'user2@example.com' }],
    ]

    const result = transformData(data, session)
    expect(result[0][0].email).toBe('u***@example.com')
  })
})

describe('Transform Response', () => {
  it('should transform array response', () => {
    const session: any = {
      user: { isDemo: true },
    }

    const data = [
      { id: '1', email: 'user1@example.com' },
      { id: '2', email: 'user2@example.com' },
    ]

    const result = transformResponse(data, session)
    expect(result[0].email).toBe('u***@example.com')
    expect(result[1].email).toBe('u***@example.com')
  })

  it('should transform object response', () => {
    const session: any = {
      user: { isDemo: true },
    }

    const data = {
      email: 'user@example.com',
      phone: '404-555-9231',
    }

    const result = transformResponse(data, session)
    expect(result.email).toBe('u***@example.com')
    expect(result.phone).toBe('***-***-9231')
  })

  it('should handle custom fields', () => {
    const session: any = {
      user: { isDemo: true },
    }

    const data = {
      userEmail: 'user@example.com',
      contactPhone: '404-555-9231',
    }

    const result = transformResponse(data, session, {
      fields: ['userEmail', 'contactPhone'],
    })
    expect(result.userEmail).toBe('u***@example.com')
    expect(result.contactPhone).toBe('***-***-9231')
  })

  it('should not transform for regular session', () => {
    const session: any = {
      user: { isDemo: false },
    }

    const data = { email: 'user@example.com' }
    const result = transformResponse(data, session)
    expect(result.email).toBe('user@example.com')
  })
})

describe('Get Masking Status', () => {
  it('should detect demo via isDemo flag', () => {
    const session: any = {
      user: { isDemo: true },
    }

    const status = getMaskingStatus(session)
    expect(status.isDemo).toBe(true)
    expect(status.reason).toBe('user.isDemo flag')
  })

  it('should detect demo via currentOrg role', () => {
    const session: any = {
      user: {
        isDemo: false,
        currentOrg: { role: 'DEMO' },
      },
    }

    const status = getMaskingStatus(session)
    expect(status.isDemo).toBe(true)
    expect(status.reason).toBe('currentOrg.role === DEMO')
  })

  it('should detect demo via demoOrgId', () => {
    const session: any = {
      user: {
        isDemo: false,
        demoOrgId: 'demo-org-123',
      },
    }

    const status = getMaskingStatus(session)
    expect(status.isDemo).toBe(true)
    expect(status.reason).toBe('demoOrgId present')
  })

  it('should return false for regular user', () => {
    const session: any = {
      user: {
        isDemo: false,
        currentOrg: { role: 'MEMBER' },
      },
    }

    const status = getMaskingStatus(session)
    expect(status.isDemo).toBe(false)
    expect(status.reason).toBe(null)
  })

  it('should handle null session', () => {
    const status = getMaskingStatus(null)
    expect(status.isDemo).toBe(false)
    expect(status.reason).toBe(null)
  })
})

describe('Integration Scenarios', () => {
  it('should handle complete API response with nested data', () => {
    const session: any = {
      user: { isDemo: true },
    }

    const response = {
      contacts: [
        {
          id: '1',
          email: 'john@example.com',
          phone: '404-555-9231',
          company: {
            id: 'c1',
            email: 'info@company.com',
          },
        },
      ],
      total: 1,
      page: 1,
    }

    const result = {
      ...response,
      contacts: transformContacts(response.contacts as any, session),
    }

    expect(result.contacts[0].email).toBe('j***@example.com')
    expect(result.contacts[0].phone).toBe('***-***-9231')
    expect(result.total).toBe(1)
  })

  it('should preserve non-PII data in mixed responses', () => {
    const session: any = {
      user: { isDemo: true },
    }

    const data = {
      id: 'record-123',
      email: 'user@example.com',
      phone: '404-555-9231',
      name: 'John Doe',
      title: 'CEO',
      notes: 'Important contact',
      createdAt: new Date('2024-01-01'),
      metadata: {
        source: 'import',
        score: 95,
      },
    }

    const result = transformData(data, session)
    expect(result.email).toBe('u***@example.com')
    expect(result.phone).toBe('***-***-9231')
    expect(result.name).toBe('John Doe')
    expect(result.title).toBe('CEO')
    expect(result.notes).toBe('Important contact')
    expect(result.metadata.score).toBe(95)
  })
})
