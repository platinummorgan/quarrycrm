import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { query = 'test', page = 1, pageSize = 50 } = await request.json()

    const skip = (page - 1) * pageSize

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where: {
          title: { contains: query, mode: 'insensitive' },
        },
        take: pageSize,
        skip,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          value: true,
          probability: true,
          expectedClose: true,
          createdAt: true,
          stage: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          company: {
            select: {
              id: true,
              name: true,
            },
          },
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.deal.count({
        where: {
          title: { contains: query, mode: 'insensitive' },
        },
      }),
    ])

    return NextResponse.json({
      data: deals,
      total,
      page,
      pageSize,
      query,
    })
  } catch (error) {
    console.error('Deals search benchmark failed:', error)
    return NextResponse.json({ error: 'Benchmark failed' }, { status: 500 })
  }
}
