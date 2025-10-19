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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Users,
  Loader2,
  Mail,
  UserPlus,
  Trash2,
  Copy,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'

export function MembersSettings() {
  const { data: members, isLoading } = trpc.settings.getMembers.useQuery()
  const utils = trpc.useUtils()

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'MEMBER' | 'ADMIN' | 'OWNER'>(
    'MEMBER'
  )
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [copied, setCopied] = useState(false)

  const [memberToRemove, setMemberToRemove] = useState<string | null>(null)
  const [memberToChangeRole, setMemberToChangeRole] = useState<{
    id: string
    role: string
  } | null>(null)

  const inviteMutation = trpc.settings.inviteMember.useMutation({
    onSuccess: (data) => {
      setInviteUrl(data.inviteUrl)
      toast.success('Invitation created successfully')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const updateRoleMutation = trpc.settings.updateMemberRole.useMutation({
    onSuccess: () => {
      toast.success('Member role updated')
      utils.settings.getMembers.invalidate()
      setMemberToChangeRole(null)
    },
    onError: (error) => {
      toast.error(error.message)
      setMemberToChangeRole(null)
    },
  })

  const removeMutation = trpc.settings.removeMember.useMutation({
    onSuccess: () => {
      toast.success('Member removed from workspace')
      utils.settings.getMembers.invalidate()
      setMemberToRemove(null)
    },
    onError: (error) => {
      toast.error(error.message)
      setMemberToRemove(null)
    },
  })

  const handleInvite = () => {
    inviteMutation.mutate({
      email: inviteEmail,
      role: inviteRole,
    })
  }

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Invite link copied to clipboard')
  }

  const handleRemoveMember = () => {
    if (memberToRemove) {
      removeMutation.mutate({ memberId: memberToRemove })
    }
  }

  const handleRoleChange = (memberId: string, newRole: string) => {
    setMemberToChangeRole({ id: memberId, role: newRole })
  }

  const confirmRoleChange = () => {
    if (memberToChangeRole) {
      updateRoleMutation.mutate({
        memberId: memberToChangeRole.id,
        role: memberToChangeRole.role as 'OWNER' | 'ADMIN' | 'MEMBER',
      })
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100'
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
    }
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
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members
              </CardTitle>
              <CardDescription>
                Invite and manage team members, assign roles
              </CardDescription>
            </div>
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation link to a new team member
                  </DialogDescription>
                </DialogHeader>

                {!inviteUrl ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="colleague@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={inviteRole}
                        onValueChange={(v) => setInviteRole(v as any)}
                      >
                        <SelectTrigger id="role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MEMBER">Member</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="OWNER">Owner</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground">
                        {inviteRole === 'OWNER' &&
                          'Full access to all workspace settings'}
                        {inviteRole === 'ADMIN' &&
                          'Can manage members and most settings'}
                        {inviteRole === 'MEMBER' &&
                          'Can view and edit contacts, companies, deals'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-muted p-4">
                      <p className="mb-2 text-sm font-medium">
                        Invitation Link
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 break-all rounded border bg-background p-2 text-xs">
                          {inviteUrl}
                        </code>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCopyInvite}
                                aria-label="Copy invitation link"
                              >
                                {copied ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{copied ? 'Copied!' : 'Copy invite link'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      This link will expire in 7 days. Share it with{' '}
                      <strong>{inviteEmail}</strong> to join your workspace.
                    </p>
                  </div>
                )}

                <DialogFooter>
                  {!inviteUrl ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setInviteDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleInvite}
                        disabled={!inviteEmail || inviteMutation.isLoading}
                      >
                        {inviteMutation.isLoading && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Generate Invite Link
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => {
                        setInviteDialogOpen(false)
                        setInviteUrl('')
                        setInviteEmail('')
                      }}
                    >
                      Done
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {members?.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {member.user.name?.[0]?.toUpperCase() ||
                        member.user.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {member.user.name || 'Unnamed'}
                    </p>
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {member.user.email}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Select
                    value={member.role}
                    onValueChange={(value) =>
                      handleRoleChange(member.id, value)
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OWNER">Owner</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="MEMBER">Member</SelectItem>
                    </SelectContent>
                  </Select>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setMemberToRemove(member.id)}
                          aria-label="Remove member"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Remove member</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Remove Member Confirmation Dialog */}
      <AlertDialog
        open={!!memberToRemove}
        onOpenChange={() => setMemberToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member from your workspace?
              They will lose access to all data and settings. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMutation.isLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Role Confirmation Dialog */}
      <AlertDialog
        open={!!memberToChangeRole}
        onOpenChange={() => setMemberToChangeRole(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Member Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change this member's role to{' '}
              <strong>{memberToChangeRole?.role}</strong>? This will modify
              their permissions immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange}>
              {updateRoleMutation.isLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Change Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
