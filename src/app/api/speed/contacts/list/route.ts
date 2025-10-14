import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { page = 1, pageSize = 50 } = await request.json()

    // Add performance mark
    const startMark = `contacts-list-${Date.now()}`
    
    const skip = (page - 1) * pageSize

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        take: pageSize,
        skip,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          createdAt: true,
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.contact.count(),
    ])

    return NextResponse.json({
      data: contacts,
      total,
      page,
      pageSize,
      performanceMark: startMark,
    })
  } catch (error) {
    console.error('Contacts list benchmark failed:', error)
    return NextResponse.json(
      { error: 'Benchmark failed' },
      { status: 500 }
    )
  }
}
