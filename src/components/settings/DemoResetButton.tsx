'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, AlertTriangle } from 'lucide-react'
import { useSession } from 'next-auth/react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'

interface DemoResetButtonProps {
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

/**
 * DemoResetButton
 *
 * Button to reset demo organization data.
 * Only visible in non-production and for demo org owners.
 *
 * Features:
 * - Confirmation dialog before reset
 * - Loading state during reset
 * - Toast notifications for success/error
 * - Automatic page reload after success
 */
export function DemoResetButton({
  variant = 'outline',
  size = 'sm',
}: DemoResetButtonProps) {
  const [isResetting, setIsResetting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const { data: session } = useSession()
  const { toast } = useToast()

  // Only show in non-production
  const isProduction = process.env.NEXT_PUBLIC_APP_ENV === 'prod'
  if (isProduction) return null

  // Check if user is in demo org (isDemo flag OR role is DEMO)
  const isDemo =
    session?.user?.isDemo || session?.user?.currentOrg?.role === 'DEMO'

  // Only show for OWNER role
  const isOwner = session?.user?.currentOrg?.role === 'OWNER'

  // Show only if user is owner of a demo org
  if (!isDemo || !isOwner) return null

  const handleReset = async () => {
    setIsResetting(true)

    try {
      const response = await fetch('/api/admin/demo-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset demo data')
      }

      // Show success toast
      toast({
        title: 'Demo Reset Complete',
        description: `Reset ${data.stats.after.contacts} contacts, ${data.stats.after.companies} companies, ${data.stats.after.deals} deals, and ${data.stats.after.activities} activities.`,
        variant: 'default',
      })

      // Close dialog
      setIsOpen(false)

      // Reload page after short delay to show new data
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error) {
      console.error('Demo reset failed:', error)
      toast({
        title: 'Reset Failed',
        description:
          error instanceof Error ? error.message : 'Failed to reset demo data',
        variant: 'destructive',
      })
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={isResetting}
          className="gap-2"
        >
          <RefreshCw
            className={`h-4 w-4 ${isResetting ? 'animate-spin' : ''}`}
          />
          {isResetting ? 'Resetting...' : 'Reset Demo Data'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Reset Demo Data?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              This will <strong>delete all current data</strong> and regenerate
              fresh demo data:
            </p>
            <ul className="list-inside list-disc space-y-1 text-sm">
              <li>3,000 contacts</li>
              <li>500 companies</li>
              <li>200 deals</li>
              <li>300 activities</li>
            </ul>
            <p className="font-medium text-yellow-600 dark:text-yellow-500">
              ⚠️ This action cannot be undone. All current demo data will be
              lost.
            </p>
            <p className="text-sm text-muted-foreground">
              This process takes about 30-60 seconds.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleReset()
            }}
            disabled={isResetting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isResetting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset Demo Data
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
