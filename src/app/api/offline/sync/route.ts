import { NextRequest, NextResponse } from 'next/server'
import { OutboxManager } from '@/lib/outbox-manager'
import { demoGuard } from '@/lib/demo-guard'

export async function POST(request: NextRequest) {
  // Block demo users from sync operations
  const demoCheck = await demoGuard()
  if (demoCheck) return demoCheck

  try {
    // Get the outbox manager instance
    const outboxManager = OutboxManager.getInstance()

    // Process the outbox
    await outboxManager.processOutbox()

    return NextResponse.json({
      success: true,
      message: 'Outbox processed successfully',
    })
  } catch (error) {
    console.error('Background sync processing failed:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process outbox' },
      { status: 500 }
    )
  }
}
