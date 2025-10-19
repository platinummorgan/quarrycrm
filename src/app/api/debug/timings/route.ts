import { NextResponse } from 'next/server'
import { getTimingData, clearTimingData } from '@/lib/server-timing'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 404 }
    )
  }

  const timings = getTimingData()

  return NextResponse.json({
    timings,
    stats: {
      total: timings.length,
      avgTotal:
        timings.reduce((acc, t) => acc + t.totalDuration, 0) / timings.length ||
        0,
      avgSql:
        timings.reduce((acc, t) => acc + t.sqlDuration, 0) / timings.length ||
        0,
      avgHandler:
        timings.reduce((acc, t) => acc + t.handlerDuration, 0) /
          timings.length || 0,
      slowest: timings.slice(0, 10),
    },
  })
}

export async function DELETE() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 404 }
    )
  }

  clearTimingData()

  return NextResponse.json({ success: true, message: 'Timing data cleared' })
}
