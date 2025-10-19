import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { page = 1, pageSize = 50 } = await request.json()

    const skip = (page - 1) * pageSize

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
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
      prisma.deal.count(),
    ])

    return NextResponse.json({
      data: deals,
      total,
      page,
      pageSize,
    })
  } catch (error) {
    console.error('Deals list benchmark failed:', error)
    return NextResponse.json({ error: 'Benchmark failed' }, { status: 500 })
  }
}
