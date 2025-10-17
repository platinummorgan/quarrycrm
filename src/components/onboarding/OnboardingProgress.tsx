'use client'

import { CheckCircle2 } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { OnboardingState } from '@/lib/onboarding'

interface OnboardingProgressProps {
  state: OnboardingState
}

export function OnboardingProgress({ state }: OnboardingProgressProps) {
  // Don't show if dismissed or completed
  if (state.dismissed || state.completed) {
    return null
  }

  return (
    <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5">
      <div className="flex items-center gap-1.5">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-foreground">
          Setup: {state.completedCount}/{state.totalCount}
        </span>
      </div>
      <div className="h-2 w-16 overflow-hidden rounded-full bg-background">
        <div
          className={cn(
            'h-full transition-all duration-500 ease-in-out',
            state.percentage < 100 ? 'bg-primary' : 'bg-green-500'
          )}
          style={{ width: `${state.percentage}%` }}
        />
      </div>
    </div>
  )
}
