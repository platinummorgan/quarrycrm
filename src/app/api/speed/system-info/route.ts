import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const [contactsCount, companiesCount, dealsCount] = await Promise.all([
      prisma.contact.count(),
      prisma.company.count(),
      prisma.deal.count(),
    ])

    return NextResponse.json({
      contacts: contactsCount,
      companies: companiesCount,
      deals: dealsCount,
      userAgent: '',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to fetch system info:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system info' },
      { status: 500 }
    )
  }
}
