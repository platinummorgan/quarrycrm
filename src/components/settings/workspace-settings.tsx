'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Building2, Loader2, Mail } from 'lucide-react'
import { toast } from 'sonner'

export function WorkspaceSettings() {
  const { data: workspace, isLoading } = trpc.settings.getWorkspace.useQuery()
  const utils = trpc.useUtils()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [logo, setLogo] = useState('')
  const [emailLogAddress, setEmailLogAddress] = useState('')

  // Update form when data loads
  useState(() => {
    if (workspace) {
      setName(workspace.name)
      setDescription(workspace.description || '')
      setLogo(workspace.logo || '')
      setEmailLogAddress(workspace.emailLogAddress || '')
    }
  })

  const updateMutation = trpc.settings.updateWorkspace.useMutation({
    onSuccess: () => {
      toast.success('Workspace settings updated')
      utils.settings.getWorkspace.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate({
      name: name || undefined,
      description: description || undefined,
      logo: logo || undefined,
      emailLogAddress: emailLogAddress || undefined,
    })
  }

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Workspace Settings
        </CardTitle>
        <CardDescription>
          Update your workspace name, logo, and email integration settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Workspace Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Inc."
              required
            />
            <p className="text-sm text-muted-foreground">
              This is your organization's display name
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of your organization"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo">Logo URL</Label>
            <Input
              id="logo"
              type="url"
              value={logo}
              onChange={(e) => setLogo(e.target.value)}
              placeholder="https://example.com/logo.png"
            />
            <p className="text-sm text-muted-foreground">
              Provide a URL to your organization's logo
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="emailLogAddress" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Log Address
            </Label>
            <Input
              id="emailLogAddress"
              type="email"
              value={emailLogAddress}
              onChange={(e) => setEmailLogAddress(e.target.value)}
              placeholder="activities@yourworkspace.quarry-crm.com"
              disabled
            />
            <p className="text-sm text-muted-foreground">
              Forward emails to this address to automatically log them as activities. This feature is coming soon.
            </p>
          </div>

          <Button type="submit" disabled={updateMutation.isLoading}>
            {updateMutation.isLoading && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Changes
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
