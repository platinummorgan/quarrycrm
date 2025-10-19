/**
 * PII Masking Usage Examples
 *
 * Demonstrates how to use the PII masking utilities in different scenarios
 */

import {
  maskEmail,
  maskPhone,
  maskPII,
  isRequestFromDemo,
} from '@/lib/mask-pii'
import {
  transformContacts,
  transformResponse,
  getMaskingStatus,
} from '@/lib/server/transform-pii'
import type { Session } from 'next-auth'

// ============================================================================
// Example 1: Client-Side Component with Manual Masking
// ============================================================================

interface ContactCardProps {
  contact: {
    id: string
    name: string
    email: string | null
    phone: string | null
  }
  session: Session | null
}

function ContactCard({ contact, session }: ContactCardProps) {
  const isDemo = isRequestFromDemo(session)

  return (
    <div className="contact-card">
      <h3>{contact.name}</h3>
      <p>Email: {isDemo ? maskEmail(contact.email) : contact.email}</p>
      <p>Phone: {isDemo ? maskPhone(contact.phone) : contact.phone}</p>
    </div>
  )
}

// ============================================================================
// Example 2: API Route with Contact Transformation
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Get current session
    const session = await getServerSession(authOptions)

    // Fetch contacts from database
    const contacts = await prisma.contact.findMany({
      where: {
        organizationId: session?.user?.currentOrg?.id,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
    })

    // Transform for demo users - masks PII automatically
    const transformed = transformContacts(contacts, session)

    return NextResponse.json({
      success: true,
      data: transformed,
      masked: isRequestFromDemo(session), // Include masking status
    })
  } catch (error) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch contacts' },
      { status: 500 }
    )
  }
}

// ============================================================================
// Example 3: tRPC Procedure with Automatic Transformation
// ============================================================================

import { router, orgProcedure } from '@/server/trpc'
import { z } from 'zod'

export const contactRouter = router({
  // List contacts with automatic PII masking
  list: orgProcedure
    .input(
      z.object({
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const contacts = await ctx.prisma.contact.findMany({
        where: { organizationId: ctx.organizationId },
        take: input.limit,
        skip: input.offset,
        include: {
          company: true, // Include company for nested masking
        },
      })

      // Use transformResponse for automatic nested masking
      return transformResponse(contacts, ctx.session)
    }),

  // Get single contact
  getById: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const contact = await ctx.prisma.contact.findUnique({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
      })

      if (!contact) {
        throw new Error('Contact not found')
      }

      // Transform single contact
      return transformResponse(contact, ctx.session)
    }),
})

// ============================================================================
// Example 4: Custom Hook with Masking
// ============================================================================

import { useSession } from 'next-auth/react'
import { useMemo } from 'react'

function useContact(contactId: string) {
  const { data: session } = useSession()
  const isDemo = isRequestFromDemo(session)

  // Fetch contact (using tRPC, React Query, etc.)
  const { data: contact, isLoading } = trpc.contact.getById.useQuery({
    id: contactId,
  })

  // Memoize masked version (though server should already mask)
  const maskedContact = useMemo(() => {
    if (!contact || !isDemo) return contact

    return {
      ...contact,
      email: maskEmail(contact.email),
      phone: maskPhone(contact.phone),
    }
  }, [contact, isDemo])

  return {
    contact: maskedContact,
    isLoading,
    isDemo,
  }
}

// ============================================================================
// Example 5: Generic PII Field with Auto-Detection
// ============================================================================

interface PIIFieldProps {
  value: string | null | undefined
  label: string
  session: Session | null
}

function PIIField({ value, label, session }: PIIFieldProps) {
  const isDemo = isRequestFromDemo(session)

  // maskPII auto-detects email vs phone vs generic
  const displayValue = isDemo ? maskPII(value) : value

  return (
    <div className="field">
      <label>{label}:</label>
      <span>{displayValue || 'N/A'}</span>
      {isDemo && <span className="badge">Demo</span>}
    </div>
  )
}

// ============================================================================
// Example 6: Debugging Masking Status
// ============================================================================

export async function GET_DebugMasking(request: NextRequest) {
  const session = await getServerSession(authOptions)

  // Get detailed masking status for debugging
  const status = getMaskingStatus(session)

  return NextResponse.json({
    session: {
      user: session?.user?.email,
      org: session?.user?.currentOrg?.name,
      role: session?.user?.currentOrg?.role,
    },
    masking: status,
    examples: {
      email: {
        original: 'john.doe@example.com',
        masked: maskEmail('john.doe@example.com'),
      },
      phone: {
        original: '(404) 555-9231',
        masked: maskPhone('(404) 555-9231'),
      },
    },
  })
}

// ============================================================================
// Example 7: Bulk Export with Masking
// ============================================================================

export async function exportContactsCSV(
  organizationId: string,
  session: Session | null
) {
  const contacts = await prisma.contact.findMany({
    where: { organizationId },
  })

  // Transform all contacts
  const transformed = transformContacts(contacts, session)

  // Generate CSV
  const csv = transformed
    .map(
      (c) => `${c.firstName},${c.lastName},${c.email || ''},${c.phone || ''}`
    )
    .join('\n')

  return `First Name,Last Name,Email,Phone\n${csv}`
}

// ============================================================================
// Example 8: Custom Fields Masking
// ============================================================================

import { maskPIIFields } from '@/lib/mask-pii'

function maskCustomerData(customer: any, session: Session | null) {
  const isDemo = isRequestFromDemo(session)

  // Mask custom field names
  return maskPIIFields(customer, isDemo, [
    'primaryEmail',
    'secondaryEmail',
    'mobilePhone',
    'officePhone',
    'emergencyContact',
  ])
}

// ============================================================================
// Example 9: React Server Component
// ============================================================================

import { getServerSession } from 'next-auth/next'

export default async function ContactsPage() {
  const session = await getServerSession(authOptions)

  const contacts = await prisma.contact.findMany({
    where: {
      organizationId: session?.user?.currentOrg?.id,
    },
  })

  // Transform on server before rendering
  const transformedContacts = transformContacts(contacts, session)

  return (
    <div>
      <h1>Contacts</h1>
      {isRequestFromDemo(session) && (
        <div className="alert">Demo Mode - PII data is masked</div>
      )}
      <ContactList contacts={transformedContacts} />
    </div>
  )
}

// ============================================================================
// Example 10: Middleware for All API Routes
// ============================================================================

// Not implemented yet, but could look like:
export async function apiMiddleware(req: NextRequest, res: NextResponse) {
  const session = await getServerSession(authOptions)

  // Log all API calls from demo users
  if (isRequestFromDemo(session)) {
    console.log(`[DEMO] API call: ${req.url}`)
  }

  // Continue to actual handler
  // Handler should use transformResponse() to mask data
}
