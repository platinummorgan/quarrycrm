'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WorkspaceSettings } from '@/components/settings/workspace-settings'
import { MembersSettings } from '@/components/settings/members-settings'
import { ApiKeysSettings } from '@/components/settings/api-keys-settings'
import { WebhooksSettings } from '@/components/settings/webhooks-settings'
import { BillingSettings } from '@/components/settings/billing-settings'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your workspace, team, and integrations
        </p>
      </div>

      <Tabs defaultValue="workspace" className="space-y-6">
        <TabsList>
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="members">Members & Roles</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="workspace">
          <WorkspaceSettings />
        </TabsContent>

        <TabsContent value="members">
          <MembersSettings />
        </TabsContent>

        <TabsContent value="api-keys">
          <ApiKeysSettings />
        </TabsContent>

        <TabsContent value="webhooks">
          <WebhooksSettings />
        </TabsContent>

        <TabsContent value="billing">
          <BillingSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
