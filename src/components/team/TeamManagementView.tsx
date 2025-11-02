'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  UserPlus,
  Mail,
  Shield,
  Users,
  Activity,
  Target,
  MoreVertical,
  Trash2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { trpc } from '@/lib/trpc'
import { useToast } from '@/hooks/use-toast'

interface TeamMember {
  id: string
  role: string
  createdAt: Date
  user: {
    id: string
    name: string | null
    email: string | null
    image: string | null
  } | null
  stats: {
    assignedDeals: number
    recentActivities: number
  }
}

interface TeamManagementViewProps {
  members: TeamMember[]
  isAdmin: boolean
}

const ROLE_LABELS = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Crew Member',
  DEMO: 'Demo',
}

const ROLE_DESCRIPTIONS = {
  ADMIN: 'Full access to all leads, jobs, and settings',
  MEMBER: 'Access to assigned leads and jobs only',
}

export function TeamManagementView({
  members,
  isAdmin,
}: TeamManagementViewProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER')
  const [inviting, setInviting] = useState(false)

  const utils = trpc.useUtils()

  const inviteMember = trpc.team.invite.useMutation({
    onSuccess: () => {
      toast({ title: 'Invitation sent!' })
      setInviteDialogOpen(false)
      setEmail('')
      router.refresh()
    },
    onError: (error) => {
      toast({
        title: 'Failed to send invitation',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const updateRole = trpc.team.updateRole.useMutation({
    onSuccess: () => {
      toast({ title: 'Role updated' })
      router.refresh()
    },
    onError: (error) => {
      toast({
        title: 'Failed to update role',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const removeMember = trpc.team.remove.useMutation({
    onSuccess: () => {
      toast({ title: 'Team member removed' })
      router.refresh()
    },
    onError: (error) => {
      toast({
        title: 'Failed to remove member',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleInvite = async () => {
    if (!email.trim()) return

    setInviting(true)
    try {
      await inviteMember.mutateAsync({ email, role })
    } finally {
      setInviting(false)
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'default'
      case 'ADMIN':
        return 'secondary'
      case 'MEMBER':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const getInitials = (name: string | null) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="space-y-6">
      {/* Team Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Team Members
                </p>
                <p className="text-2xl font-bold">{members.length}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Active Jobs
                </p>
                <p className="text-2xl font-bold">
                  {members.reduce((sum, m) => sum + m.stats.assignedDeals, 0)}
                </p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Recent Activity
                </p>
                <p className="text-2xl font-bold">
                  {members.reduce(
                    (sum, m) => sum + m.stats.recentActivities,
                    0
                  )}
                </p>
                <p className="text-xs text-muted-foreground">Last 7 days</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Manage your team and their permissions
              </CardDescription>
            </div>
            {isAdmin && (
              <Button onClick={() => setInviteDialogOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={member.user?.image || undefined} />
                    <AvatarFallback>
                      {getInitials(member.user?.name || null)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {member.user?.name || 'Unknown'}
                      </p>
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        {ROLE_LABELS[member.role as keyof typeof ROLE_LABELS]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {member.user?.email}
                    </p>
                    <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{member.stats.assignedDeals} jobs assigned</span>
                      <span>•</span>
                      <span>
                        {member.stats.recentActivities} activities (7d)
                      </span>
                    </div>
                  </div>
                </div>

                {isAdmin && member.role !== 'OWNER' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {member.role === 'MEMBER' && (
                        <DropdownMenuItem
                          onClick={() =>
                            updateRole.mutate({
                              memberId: member.id,
                              role: 'ADMIN',
                            })
                          }
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          Make Admin
                        </DropdownMenuItem>
                      )}
                      {member.role === 'ADMIN' && (
                        <DropdownMenuItem
                          onClick={() =>
                            updateRole.mutate({
                              memberId: member.id,
                              role: 'MEMBER',
                            })
                          }
                        >
                          <Users className="mr-2 h-4 w-4" />
                          Make Crew Member
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          if (
                            confirm(
                              `Remove ${member.user?.name} from the team?`
                            )
                          ) {
                            removeMember.mutate({ memberId: member.id })
                          }
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove from Team
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation email to add someone to your team
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="crew@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleInvite()
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as 'ADMIN' | 'MEMBER')}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Admin</span>
                      <span className="text-xs text-muted-foreground">
                        {ROLE_DESCRIPTIONS.ADMIN}
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="MEMBER">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Crew Member</span>
                      <span className="text-xs text-muted-foreground">
                        {ROLE_DESCRIPTIONS.MEMBER}
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setInviteDialogOpen(false)
                  setEmail('')
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleInvite} disabled={inviting || !email}>
                <Mail className="mr-2 h-4 w-4" />
                {inviting ? 'Sending...' : 'Send Invitation'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
