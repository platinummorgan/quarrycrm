import { WorkspaceCard } from '@/components/settings/WorkspaceCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CreditCard } from 'lucide-react'
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
