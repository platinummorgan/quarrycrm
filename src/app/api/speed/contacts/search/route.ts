import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { query = 'test', page = 1, pageSize = 50 } = await request.json()

    const skip = (page - 1) * pageSize

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where: {
          OR: [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
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
      prisma.contact.count({
        where: {
          OR: [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
      }),
    ])

    return NextResponse.json({
      data: contacts,
      total,
      page,
      pageSize,
      query,
    })
  } catch (error) {
    console.error('Contacts search benchmark failed:', error)
    return NextResponse.json(
      { error: 'Benchmark failed' },
      { status: 500 }
    )
  }
}
