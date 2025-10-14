import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { page = 1, pageSize = 50 } = await request.json()

    const skip = (page - 1) * pageSize

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        take: pageSize,
        skip,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          website: true,
          industry: true,
          description: true,
          createdAt: true,
          _count: {
            select: {
              contacts: true,
              deals: true,
            },
          },
        },
      }),
      prisma.company.count(),
    ])

    return NextResponse.json({
      data: companies,
      total,
      page,
      pageSize,
    })
  } catch (error) {
    console.error('Companies list benchmark failed:', error)
    return NextResponse.json(
      { error: 'Benchmark failed' },
      { status: 500 }
    )
  }
}
