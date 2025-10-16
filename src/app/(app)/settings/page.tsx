import { WorkspaceCard } from '@/components/settings/WorkspaceCard'
import { DemoResetButton } from '@/components/settings/DemoResetButton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CreditCard, Database } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Settings - Quarry CRM',
  description: 'Manage your workspace settings and preferences',
}

export default function SettingsPage() {
  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your workspace settings and preferences
        </p>
      </div>

      <div className="space-y-6">
        <WorkspaceCard />

        {/* Demo Reset Card - Only visible in non-prod for demo org owners */}
        <Card className="border-yellow-200 dark:border-yellow-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
              Demo Data Management
            </CardTitle>
            <CardDescription>
              Reset demo organization data to fresh state
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Regenerate 3,000 contacts, 500 companies, 200 deals, and 300 activities.
                Only available for demo organization owners in non-production environments.
              </p>
              <DemoResetButton />
            </div>
          </CardContent>
        </Card>

        {/* Billing Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Billing & Plans
            </CardTitle>
            <CardDescription>
              Manage your subscription and view usage limits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/app/settings/billing">
              <Button>
                View Billing
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
