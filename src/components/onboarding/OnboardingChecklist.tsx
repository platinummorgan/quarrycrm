'use client'

import { useState, useTransition } from 'react'
import { X, CheckCircle2, Circle, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  ONBOARDING_TASKS,
  type OnboardingState,
  type OnboardingTaskType,
} from '@/lib/onboarding'
import { dismissOnboarding, completeOnboardingTask } from '@/server/onboarding'
import { toast } from 'sonner'
import Link from 'next/link'

interface OnboardingChecklistProps {
  initialState: OnboardingState
}

export function OnboardingChecklist({
  initialState,
}: OnboardingChecklistProps) {
  const [state, setState] = useState(initialState)
  const [isPending, startTransition] = useTransition()

  if (state.dismissed || state.completed) {
    return null
  }

  const handleDismiss = () => {
    startTransition(async () => {
      const result = await dismissOnboarding()
      if (result.success) {
        setState({ ...state, dismissed: true })
        toast.success('Checklist dismissed')
      } else {
        toast.error('Failed to dismiss checklist')
      }
    })
  }

  const handleTaskClick = async (
    taskId: OnboardingTaskType,
    action?: string
  ) => {
    if (action === 'installPWA') {
      // Trigger PWA install
      const deferredPrompt = (window as any).deferredPrompt
      if (deferredPrompt) {
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') {
          startTransition(async () => {
            await completeOnboardingTask('install_pwa')
            setState({
              ...state,
              progress: { ...state.progress, install_pwa: true },
              completedCount: state.completedCount + 1,
            })
            toast.success('App installed!')
          })
        }
        ;(window as any).deferredPrompt = null
      } else {
        toast.info('PWA install prompt not available')
      }
    }
  }

  const handleDownloadSample = () => {
    const link = document.createElement('a')
    link.href = '/samples/contacts-sample.csv'
    link.download = 'contacts-sample.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Sample CSV downloaded!')
  }

  const tasks = ONBOARDING_TASKS.map((task) => ({
    ...task,
    completed: state.progress[task.id],
  }))

  return (
    <Card className="relative border-primary/20 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Get Started</CardTitle>
            <CardDescription>
              Complete these tasks to set up your CRM
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
            disabled={isPending}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {state.completedCount} of {state.totalCount} complete
            </span>
            <span className="font-semibold">{state.percentage}%</span>
          </div>
          <Progress value={state.percentage} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.map((task) => {
          const content = (
            <>
              <div className="mt-0.5">
                {task.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{task.icon}</span>
                  <p
                    className={cn(
                      'text-sm font-medium leading-none',
                      task.completed && 'text-muted-foreground line-through'
                    )}
                  >
                    {task.title}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {task.description}
                </p>
                {task.id === 'import_csv' && !task.completed && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 h-7 text-xs"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleDownloadSample()
                    }}
                  >
                    <Download className="mr-1 h-3 w-3" />
                    Download Sample CSV
                  </Button>
                )}
              </div>
            </>
          )

          return (
            <div key={task.id} className="group">
              {task.href ? (
                <Link
                  href={task.href}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-colors hover:bg-accent'
                  )}
                >
                  {content}
                </Link>
              ) : (
                <div
                  className={cn(
                    'flex items-start gap-3 rounded-lg p-3 transition-colors',
                    task.action && 'cursor-pointer hover:bg-accent'
                  )}
                  onClick={() =>
                    task.action && handleTaskClick(task.id, task.action)
                  }
                >
                  {content}
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
