'use client'

import {
  useState,
  useRef,
  useEffect,
  useOptimistic,
  useTransition,
} from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from '@/lib/toast'
import { Copy, Upload, Loader2, Check, Building2 } from 'lucide-react'
import { getWorkspace, updateWorkspace } from '@/server/workspace'

interface Workspace {
  id: string
  name: string
  domain: string | null
  description: string | null
  logo: string | null
  emailLogAddress: string | null
  createdAt: Date
  updatedAt: Date
}

export function WorkspaceCard() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState('')
  const [logo, setLogo] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Optimistic updates
  const [optimisticWorkspace, updateOptimisticWorkspace] = useOptimistic(
    workspace,
    (state, newState: Partial<Workspace>) =>
      state ? { ...state, ...newState } : null
  )

  const [isPending, startTransition] = useTransition()

  // Load workspace on mount
  useEffect(() => {
    startTransition(async () => {
      try {
        const data = await getWorkspace()
        setWorkspace(data)
        setName(data.name)
        setLogo(data.logo)
      } catch (error) {
        console.error('Failed to load workspace:', error)
        toast.error('Failed to load workspace')
      } finally {
        setIsLoading(false)
      }
    })
  }, [])

  // Handle logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file type', 'Please upload an image file')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large', 'Maximum file size is 5MB')
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const data = await response.json()
      setLogo(data.url)

      // Optimistically update the workspace
      updateOptimisticWorkspace({ logo: data.url })

      toast.success('Logo uploaded successfully')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload logo', 'Please try again')
    } finally {
      setIsUploading(false)
    }
  }

  // Handle save
  const handleSave = async () => {
    if (!optimisticWorkspace) return

    if (!name.trim()) {
      toast.error('Workspace name is required')
      return
    }

    // Optimistically update the UI
    const optimisticUpdate = {
      name: name.trim(),
      logo: logo,
    }
    updateOptimisticWorkspace(optimisticUpdate)
    setIsEditing(false)

    startTransition(async () => {
      try {
        const updatedWorkspace = await updateWorkspace({
          name: name.trim(),
          logo: logo,
        })

        // Update the actual state
        setWorkspace(updatedWorkspace)
        setName(updatedWorkspace.name)
        setLogo(updatedWorkspace.logo)

        toast.success('Workspace updated successfully')
      } catch (error) {
        console.error('Failed to update workspace:', error)
        toast.error('Failed to update workspace', 'Please try again')

        // Revert optimistic update on error
        if (workspace) {
          setName(workspace.name)
          setLogo(workspace.logo)
          updateOptimisticWorkspace(workspace)
        }
        setIsEditing(true)
      }
    })
  }

  // Handle cancel
  const handleCancel = () => {
    if (optimisticWorkspace) {
      setName(optimisticWorkspace.name)
      setLogo(optimisticWorkspace.logo)
    }
    setIsEditing(false)
  }

  // Generate slug from name for log email
  const generateSlug = (orgName: string) => {
    return (
      orgName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50) || 'workspace'
    )
  }

  // Copy log email to clipboard
  const handleCopyEmail = async () => {
    if (!optimisticWorkspace) return

    const slug = generateSlug(optimisticWorkspace.name)
    const logEmail = `log@${slug}.quarrycrm.app`

    try {
      await navigator.clipboard.writeText(logEmail)
      setIsCopied(true)
      toast.success('Email copied to clipboard')
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      toast.error('Failed to copy email')
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workspace Settings</CardTitle>
          <CardDescription>
            Manage your workspace name and branding
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!optimisticWorkspace) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workspace Settings</CardTitle>
          <CardDescription>
            Manage your workspace name and branding
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No workspace found. Please contact support.
          </p>
        </CardContent>
      </Card>
    )
  }

  const slug = generateSlug(optimisticWorkspace.name)
  const logEmail = `log@${slug}.quarrycrm.app`

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace Settings</CardTitle>
        <CardDescription>
          Manage your workspace name and branding
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Section */}
        <div className="space-y-2">
          <Label>Workspace Logo</Label>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={logo || undefined} alt={name} />
              <AvatarFallback className="text-2xl">
                {logo ? null : <Building2 className="h-10 w-10" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                disabled={isUploading || !isEditing}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || !isEditing}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {logo ? 'Change Logo' : 'Upload Logo'}
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                PNG, JPG or GIF. Max 5MB.
              </p>
            </div>
          </div>
        </div>

        {/* Name Section */}
        <div className="space-y-2">
          <Label htmlFor="workspace-name">Workspace Name</Label>
          <Input
            id="workspace-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isEditing}
            placeholder="My Workspace"
          />
        </div>

        {/* Log Email Section */}
        <div className="space-y-2">
          <Label htmlFor="log-email">Log Email Address</Label>
          <div className="flex gap-2">
            <Input
              id="log-email"
              value={logEmail}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleCopyEmail}
              title="Copy email address"
            >
              {isCopied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Forward emails to this address to automatically log activities in
            your CRM.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 border-t pt-4">
          {isEditing ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleSave} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </>
          ) : (
            <Button type="button" onClick={() => setIsEditing(true)}>
              Edit Workspace
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
