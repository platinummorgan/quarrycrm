'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { Webhook, Loader2, Plus, Trash2, Edit, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

const AVAILABLE_EVENTS = [
  { value: 'contact.created', label: 'Contact Created' },
  { value: 'contact.updated', label: 'Contact Updated' },
  { value: 'contact.deleted', label: 'Contact Deleted' },
  { value: 'company.created', label: 'Company Created' },
  { value: 'company.updated', label: 'Company Updated' },
  { value: 'company.deleted', label: 'Company Deleted' },
  { value: 'deal.created', label: 'Deal Created' },
  { value: 'deal.updated', label: 'Deal Updated' },
  { value: 'deal.deleted', label: 'Deal Deleted' },
  { value: 'deal.won', label: 'Deal Won' },
  { value: 'deal.lost', label: 'Deal Lost' },
  { value: 'activity.created', label: 'Activity Created' },
  { value: 'activity.updated', label: 'Activity Updated' },
  { value: 'activity.completed', label: 'Activity Completed' },
]

export function WebhooksSettings() {
  const { data: webhooks, isLoading } = trpc.settings.getWebhooks.useQuery()
  const { data: planUsage } = trpc.settings.getPlanUsage.useQuery()
  const utils = trpc.useUtils()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState<any>(null)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [isActive, setIsActive] = useState(true)
  const [webhookToDelete, setWebhookToDelete] = useState<string | null>(null)
  const [copiedSecret, setCopiedSecret] = useState<string | null>(null)

  const createMutation = trpc.settings.createWebhook.useMutation({
    onSuccess: () => {
      toast.success('Webhook created successfully')
      utils.settings.getWebhooks.invalidate()
      utils.settings.getPlanUsage.invalidate()
      closeDialog()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const updateMutation = trpc.settings.updateWebhook.useMutation({
    onSuccess: () => {
      toast.success('Webhook updated')
      utils.settings.getWebhooks.invalidate()
      closeDialog()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const deleteMutation = trpc.settings.deleteWebhook.useMutation({
    onSuccess: () => {
      toast.success('Webhook deleted')
      utils.settings.getWebhooks.invalidate()
      utils.settings.getPlanUsage.invalidate()
      setWebhookToDelete(null)
    },
    onError: (error) => {
      toast.error(error.message)
      setWebhookToDelete(null)
    },
  })

  const handleSubmit = () => {
    if (editingWebhook) {
      updateMutation.mutate({
        id: editingWebhook.id,
        url: webhookUrl || undefined,
        events: selectedEvents.length > 0 ? selectedEvents : undefined,
        isActive,
      })
    } else {
      createMutation.mutate({
        url: webhookUrl,
        events: selectedEvents,
        isActive,
      })
    }
  }

  const closeDialog = () => {
    setCreateDialogOpen(false)
    setEditingWebhook(null)
    setWebhookUrl('')
    setSelectedEvents([])
    setIsActive(true)
  }

  const openEditDialog = (webhook: any) => {
    setEditingWebhook(webhook)
    setWebhookUrl(webhook.url)
    setSelectedEvents(webhook.events)
    setIsActive(webhook.isActive)
    setCreateDialogOpen(true)
  }

  const toggleEvent = (eventValue: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventValue)
        ? prev.filter((e) => e !== eventValue)
        : [...prev, eventValue]
    )
  }

  const handleCopySecret = (secret: string, webhookId: string) => {
    navigator.clipboard.writeText(secret)
    setCopiedSecret(webhookId)
    setTimeout(() => setCopiedSecret(null), 2000)
    toast.success('Webhook secret copied')
  }

  const canCreateWebhook = planUsage
    ? planUsage.limits.webhooks === -1 ||
      planUsage.usage.webhooks < planUsage.limits.webhooks
    : true

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Webhooks
              </CardTitle>
              <CardDescription>
                Subscribe to events and receive real-time notifications
              </CardDescription>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={!canCreateWebhook}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Webhook
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingWebhook ? 'Edit Webhook' : 'Create New Webhook'}
                  </DialogTitle>
                  <DialogDescription>
                    Configure a webhook endpoint to receive event notifications
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="webhookUrl">Endpoint URL</Label>
                    <Input
                      id="webhookUrl"
                      type="url"
                      placeholder="https://your-app.com/webhooks/crm"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      The URL where webhook events will be sent via POST request
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Subscribe to Events</Label>
                    <div className="max-h-60 overflow-y-auto rounded-lg border p-4">
                      <div className="grid grid-cols-2 gap-3">
                        {AVAILABLE_EVENTS.map((event) => (
                          <div
                            key={event.value}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={event.value}
                              checked={selectedEvents.includes(event.value)}
                              onCheckedChange={() => toggleEvent(event.value)}
                            />
                            <label
                              htmlFor={event.value}
                              className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {event.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Select which events should trigger this webhook
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isActive"
                      checked={isActive}
                      onCheckedChange={(checked) =>
                        setIsActive(checked as boolean)
                      }
                    />
                    <label
                      htmlFor="isActive"
                      className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Enable webhook (active)
                    </label>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={closeDialog}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={
                      !webhookUrl ||
                      selectedEvents.length === 0 ||
                      createMutation.isLoading ||
                      updateMutation.isLoading
                    }
                  >
                    {(createMutation.isLoading || updateMutation.isLoading) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingWebhook ? 'Update Webhook' : 'Create Webhook'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {planUsage && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Webhook className="h-4 w-4" />
              <span>
                {planUsage.usage.webhooks} /{' '}
                {planUsage.limits.webhooks === -1
                  ? '∞'
                  : planUsage.limits.webhooks}{' '}
                webhooks used
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {!canCreateWebhook && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
              <p className="text-sm text-amber-900 dark:text-amber-100">
                You've reached your plan limit for webhooks. Upgrade to create
                more.
              </p>
            </div>
          )}

          {webhooks && webhooks.length > 0 ? (
            <div className="space-y-4">
              {webhooks.map((webhook: any) => (
                <div
                  key={webhook.id}
                  className="space-y-3 rounded-lg border p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-muted px-2 py-1 text-sm">
                          {webhook.url}
                        </code>
                        {webhook.isActive ? (
                          <Badge>Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Created by{' '}
                        {webhook.owner.user.name || webhook.owner.user.email}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(webhook)}
                              aria-label="Edit webhook"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit webhook</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setWebhookToDelete(webhook.id)}
                              aria-label="Delete webhook"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete webhook</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {webhook.events.slice(0, 5).map((event: string) => (
                      <Badge key={event} variant="outline" className="text-xs">
                        {event}
                      </Badge>
                    ))}
                    {webhook.events.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{webhook.events.length - 5} more
                      </Badge>
                    )}
                  </div>

                  <div className="rounded bg-muted p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-xs font-medium">Signing Secret</p>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2"
                              onClick={() =>
                                handleCopySecret(webhook.secret, webhook.id)
                              }
                              aria-label="Copy signing secret"
                            >
                              {copiedSecret === webhook.id ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {copiedSecret === webhook.id
                                ? 'Copied!'
                                : 'Copy secret'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <code className="break-all text-xs text-muted-foreground">
                      {webhook.secret}
                    </code>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Use this secret to verify webhook signatures
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <Webhook className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>No webhooks configured</p>
              <p className="mt-1 text-sm">
                Create your first webhook to receive event notifications
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Webhook Confirmation Dialog */}
      <AlertDialog
        open={!!webhookToDelete}
        onOpenChange={() => setWebhookToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this webhook? You will stop
              receiving event notifications at this endpoint. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                webhookToDelete &&
                deleteMutation.mutate({ id: webhookToDelete })
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete Webhook
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
