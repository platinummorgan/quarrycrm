'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Key, Loader2, Plus, Copy, Check, Trash2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

export function ApiKeysSettings() {
  const { data: apiKeys, isLoading } = trpc.settings.getApiKeys.useQuery()
  const { data: planUsage } = trpc.settings.getPlanUsage.useQuery()
  const utils = trpc.useUtils()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [expiresInDays, setExpiresInDays] = useState('90')
  const [newApiKey, setNewApiKey] = useState('')
  const [copied, setCopied] = useState(false)
  const [keyToRevoke, setKeyToRevoke] = useState<string | null>(null)

  const createMutation = trpc.settings.createApiKey.useMutation({
    onSuccess: (data) => {
      setNewApiKey(data.plainKey)
      utils.settings.getApiKeys.invalidate()
      utils.settings.getPlanUsage.invalidate()
      toast.success('API key created successfully')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const revokeMutation = trpc.settings.revokeApiKey.useMutation({
    onSuccess: () => {
      toast.success('API key revoked')
      utils.settings.getApiKeys.invalidate()
      utils.settings.getPlanUsage.invalidate()
      setKeyToRevoke(null)
    },
    onError: (error) => {
      toast.error(error.message)
      setKeyToRevoke(null)
    },
  })

  const handleCreateKey = () => {
    createMutation.mutate({
      name: keyName,
      expiresInDays: expiresInDays ? parseInt(expiresInDays) : undefined,
    })
  }

  const handleCopyKey = () => {
    navigator.clipboard.writeText(newApiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('API key copied to clipboard')
  }

  const handleRevoke = () => {
    if (keyToRevoke) {
      revokeMutation.mutate({ id: keyToRevoke })
    }
  }

  const closeCreateDialog = () => {
    setCreateDialogOpen(false)
    setNewApiKey('')
    setKeyName('')
    setExpiresInDays('90')
  }

  const canCreateKey = planUsage
    ? planUsage.limits.apiKeys === -1 || planUsage.usage.apiKeys < planUsage.limits.apiKeys
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
                <Key className="h-5 w-5" />
                API Keys
              </CardTitle>
              <CardDescription>
                Manage API keys for programmatic access to your CRM data
              </CardDescription>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={!canCreateKey}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create API Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New API Key</DialogTitle>
                  <DialogDescription>
                    Generate a new API key for accessing your CRM data
                  </DialogDescription>
                </DialogHeader>

                {!newApiKey ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="keyName">Key Name</Label>
                      <Input
                        id="keyName"
                        placeholder="Production Server"
                        value={keyName}
                        onChange={(e) => setKeyName(e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground">
                        A descriptive name to help you identify this key
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expiresInDays">Expires In (days)</Label>
                      <Input
                        id="expiresInDays"
                        type="number"
                        placeholder="90"
                        value={expiresInDays}
                        onChange={(e) => setExpiresInDays(e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground">
                        Leave empty for no expiration. Recommended: 90-365 days
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-4 border border-amber-200 dark:border-amber-800">
                      <div className="flex gap-2 items-start mb-2">
                        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-amber-900 dark:text-amber-100">
                            Important: Save this API key now
                          </p>
                          <p className="text-sm text-amber-700 dark:text-amber-300">
                            You won't be able to see it again after closing this dialog
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg bg-muted p-4">
                      <p className="text-sm font-medium mb-2">Your API Key</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-background p-3 rounded border break-all font-mono">
                          {newApiKey}
                        </code>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={handleCopyKey}
                                aria-label="Copy API key to clipboard"
                              >
                                {copied ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{copied ? 'Copied!' : 'Copy to clipboard'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>Use this key in your API requests:</p>
                      <code className="block bg-muted p-2 rounded text-xs">
                        Authorization: Bearer {newApiKey}
                      </code>
                    </div>
                  </div>
                )}

                <DialogFooter>
                  {!newApiKey ? (
                    <>
                      <Button variant="outline" onClick={closeCreateDialog}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateKey}
                        disabled={!keyName || createMutation.isLoading}
                      >
                        {createMutation.isLoading && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Create Key
                      </Button>
                    </>
                  ) : (
                    <Button onClick={closeCreateDialog}>I've Saved My Key</Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {planUsage && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Key className="h-4 w-4" />
              <span>
                {planUsage.usage.apiKeys} / {planUsage.limits.apiKeys === -1 ? '∞' : planUsage.limits.apiKeys} API keys used
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {!canCreateKey && (
            <div className="mb-4 rounded-lg bg-amber-50 dark:bg-amber-950 p-4 border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-900 dark:text-amber-100">
                You've reached your plan limit for API keys. Upgrade to create more.
              </p>
            </div>
          )}

          {apiKeys && apiKeys.length > 0 ? (
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{key.name}</p>
                      {key.expiresAt && new Date(key.expiresAt) < new Date() && (
                        <Badge variant="destructive">Expired</Badge>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                      <code className="bg-muted px-2 py-1 rounded text-xs">
                        {key.keyPrefix}...
                      </code>
                      {key.lastUsedAt && (
                        <span>
                          Last used {formatDistanceToNow(new Date(key.lastUsedAt), { addSuffix: true })}
                        </span>
                      )}
                      {key.expiresAt && (
                        <span>
                          Expires {formatDistanceToNow(new Date(key.expiresAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created by {key.owner.user.name || key.owner.user.email}
                    </p>
                  </div>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setKeyToRevoke(key.id)}
                          aria-label="Revoke API key"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Revoke API key</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No API keys created yet</p>
              <p className="text-sm mt-1">Create your first API key to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revoke Key Confirmation Dialog */}
      <AlertDialog open={!!keyToRevoke} onOpenChange={() => setKeyToRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke this API key? Any applications using this key will immediately lose access. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revokeMutation.isLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Revoke Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
