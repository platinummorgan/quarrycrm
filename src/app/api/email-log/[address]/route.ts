import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ActivityType } from '@prisma/client'
import { demoGuard } from '@/lib/demo-guard'

// Simple email parsing - in production you'd use a proper email parsing library
interface ParsedEmail {
  from: string
  to: string
  subject: string
  body: string
  htmlBody?: string
}

function parseEmail(rawEmail: string): ParsedEmail {
  // This is a very basic parser - in production use something like mailparser
  const lines = rawEmail.split('\n')
  let from = ''
  let to = ''
  let subject = ''
  let body = ''
  let isBody = false

  for (const line of lines) {
    if (line.toLowerCase().startsWith('from:')) {
      from = line.substring(5).trim()
    } else if (line.toLowerCase().startsWith('to:')) {
      to = line.substring(3).trim()
    } else if (line.toLowerCase().startsWith('subject:')) {
      subject = line.substring(8).trim()
    } else if (line.trim() === '') {
      isBody = true
    } else if (isBody) {
      body += line + '\n'
    }
  }

  return { from, to, subject, body: body.trim() }
}

export async function POST(request: NextRequest) {
  // Demo user guard
  const demoCheck = await demoGuard()
  if (demoCheck) return demoCheck

  try {
    const rawEmail = await request.text()

    // Parse the email
    const email = parseEmail(rawEmail)

    // Find the organization by email log address
    const organization = await prisma.organization.findFirst({
      where: {
        emailLogAddress: email.to,
      },
      include: {
        members: {
          take: 1,
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found for email address' },
        { status: 404 }
      )
    }

    // Get the first member as the owner
    const defaultOwner = organization.members[0]
    if (!defaultOwner) {
      return NextResponse.json(
        { error: 'No members found in organization' },
        { status: 400 }
      )
    }

    // Try to find contact by email
    const contact = await prisma.contact.findFirst({
      where: {
        email: email.from,
        organizationId: organization.id,
      },
    })

    // Create the activity
    const activity = await prisma.activity.create({
      data: {
        type: ActivityType.EMAIL,
        subject: email.subject,
        body: email.body,
        description: `Email from ${email.from}: ${email.subject}`,
        organizationId: organization.id,
        ownerId: defaultOwner.id,
        contactId: contact?.id,
        // You might want to extract company/deal from email content or headers
      },
    })

    return NextResponse.json({
      success: true,
      activityId: activity.id,
    })

  } catch (error) {
    console.error('Email logging error:', error)
    return NextResponse.json(
      { error: 'Failed to process email' },
      { status: 500 }
    )
  }
}