import { NextRequest, NextResponse } from 'next/server'
import { PerformanceUtils } from '@/lib/metrics'

export async function GET(request: NextRequest) {
  try {
    // Get recent performance metrics
    const metrics = PerformanceUtils.getMetrics()

    // Filter to only include the operations we're interested in
    const filteredMetrics = Object.entries(metrics).reduce((acc, [key, data]) => {
      if (key.includes('contacts-list') || key.includes('deals-list')) {
        acc[key] = data
      }
      return acc
    }, {} as Record<string, any>)

    return NextResponse.json({
      metrics: filteredMetrics,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to fetch performance metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}