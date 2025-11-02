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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Phone,
  MessageSquare,
  Mail,
  Calendar,
  DollarSign,
  MapPin,
  Users,
  Camera,
  Plus,
  Edit2,
  Check,
  X,
} from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import Link from 'next/link'

const STATUS_COLORS = {
  NEW: 'bg-blue-500',
  CONTACTED: 'bg-yellow-500',
  QUOTED: 'bg-purple-500',
  WON: 'bg-green-500',
  LOST: 'bg-gray-500',
}

const STATUS_LABELS = {
  NEW: 'New Lead',
  CONTACTED: 'Contacted',
  QUOTED: 'Quoted',
  WON: 'Job Won',
  LOST: 'Lost',
}

const PAYMENT_STATUS_LABELS = {
  NOT_PAID: 'Not Paid',
  DEPOSIT_PAID: 'Deposit Paid',
  PAID_IN_FULL: 'Paid in Full',
}

interface JobDetailViewProps {
  job: any // Will be properly typed from Prisma
}

export function JobDetailView({ job }: JobDetailViewProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [editingField, setEditingField] = useState<string | null>(null)
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({})
  const [newNote, setNewNote] = useState('')

  const utils = trpc.useUtils()
  const updateDeal = trpc.deals.update.useMutation({
    onSuccess: () => {
      toast({ title: 'Updated' })
      utils.deals.invalidate()
      router.refresh()
      setEditingField(null)
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const createActivity = trpc.activities.create.useMutation({
    onSuccess: () => {
      toast({ title: 'Note added' })
      utils.activities.invalidate()
      router.refresh()
      setNewNote('')
    },
  })

  const handleFieldSave = (field: string, value: any) => {
    updateDeal.mutate({
      id: job.id,
      data: { [field]: value },
    })
  }

  const handleAddNote = () => {
    if (!newNote.trim()) return
    createActivity.mutate({
      type: 'NOTE',
      description: newNote,
      dealId: job.id,
      subject: `Note on ${job.title}`,
    })
  }

  const formatCurrency = (value: number | null) =>
    value
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
        }).format(value)
      : '$0'

  const contactName = job.contact
    ? `${job.contact.firstName} ${job.contact.lastName}`.trim()
    : 'No contact'
  const contactPhone = job.contact?.phone || ''
  const contactEmail = job.contact?.email || ''

  const startEditing = (field: string, currentValue: any) => {
    setEditingField(field)
    setFieldValues({ ...fieldValues, [field]: currentValue })
  }

  const cancelEditing = () => {
    setEditingField(null)
    setFieldValues({})
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">{job.title}</h1>
                <Badge
                  className={`${
                    STATUS_COLORS[job.status as keyof typeof STATUS_COLORS]
                  } text-white`}
                >
                  {STATUS_LABELS[job.status as keyof typeof STATUS_LABELS] || job.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {job.jobType || 'No job type specified'}
              </p>
            </div>
            <div className="text-left md:text-right">
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(job.value || job.estimatedValue)}
              </div>
              <p className="text-sm text-muted-foreground">Job Value</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Contact Info */}
          <div className="space-y-3">
            <h3 className="font-semibold">Contact</h3>
            <div className="flex flex-wrap gap-2">
              <Link href={`/app/contacts?open=${job.contact?.id}`}>
                <Button variant="outline" size="lg">
                  {contactName}
                </Button>
              </Link>
              {contactPhone && (
                <Button size="lg" asChild>
                  <a href={`tel:${contactPhone}`}>
                    <Phone className="mr-2 h-4 w-4" />
                    {contactPhone}
                  </a>
                </Button>
              )}
              {contactPhone && (
                <Button size="lg" variant="secondary" asChild>
                  <a
                    href={`sms:${contactPhone}?body=${encodeURIComponent(
                      `Hi ${job.contact?.firstName}, checking in about your ${job.jobType} project.`
                    )}`}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Text
                  </a>
                </Button>
              )}
              {contactEmail && (
                <Button size="lg" variant="outline" asChild>
                  <a href={`mailto:${contactEmail}`}>
                    <Mail className="mr-2 h-4 w-4" />
                    Email
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* JOB INFO */}
        <Card>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Job Address */}
            <div>
              <Label className="text-sm text-muted-foreground">Job Address</Label>
              {editingField === 'jobAddress' ? (
                <div className="flex gap-2">
                  <Input
                    value={fieldValues.jobAddress || ''}
                    onChange={(e) =>
                      setFieldValues({ ...fieldValues, jobAddress: e.target.value })
                    }
                    placeholder="123 Main St"
                    className="h-10"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleFieldSave('jobAddress', fieldValues.jobAddress)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEditing}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-accent"
                  onClick={() => startEditing('jobAddress', job.jobAddress)}
                >
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{job.jobAddress || 'Click to add address'}</span>
                  <Edit2 className="ml-auto h-3 w-3 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Scheduled Dates */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-sm text-muted-foreground">Start Date</Label>
                {editingField === 'scheduledStart' ? (
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={
                        fieldValues.scheduledStart
                          ? format(new Date(fieldValues.scheduledStart), 'yyyy-MM-dd')
                          : ''
                      }
                      onChange={(e) =>
                        setFieldValues({
                          ...fieldValues,
                          scheduledStart: e.target.value ? new Date(e.target.value) : null,
                        })
                      }
                      className="h-10"
                    />
                    <Button
                      size="sm"
                      onClick={() =>
                        handleFieldSave('scheduledStart', fieldValues.scheduledStart)
                      }
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={cancelEditing}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-accent"
                    onClick={() => startEditing('scheduledStart', job.scheduledStart)}
                  >
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {job.scheduledStart
                        ? format(new Date(job.scheduledStart), 'MMM d, yyyy')
                        : 'Not set'}
                    </span>
                    <Edit2 className="ml-auto h-3 w-3 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">End Date</Label>
                {editingField === 'scheduledEnd' ? (
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={
                        fieldValues.scheduledEnd
                          ? format(new Date(fieldValues.scheduledEnd), 'yyyy-MM-dd')
                          : ''
                      }
                      onChange={(e) =>
                        setFieldValues({
                          ...fieldValues,
                          scheduledEnd: e.target.value ? new Date(e.target.value) : null,
                        })
                      }
                      className="h-10"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleFieldSave('scheduledEnd', fieldValues.scheduledEnd)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={cancelEditing}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-accent"
                    onClick={() => startEditing('scheduledEnd', job.scheduledEnd)}
                  >
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {job.scheduledEnd
                        ? format(new Date(job.scheduledEnd), 'MMM d, yyyy')
                        : 'Not set'}
                    </span>
                    <Edit2 className="ml-auto h-3 w-3 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            {/* Crew Assigned */}
            <div>
              <Label className="text-sm text-muted-foreground">Crew Assigned</Label>
              {editingField === 'crewAssigned' ? (
                <div className="flex gap-2">
                  <Input
                    value={fieldValues.crewAssigned || ''}
                    onChange={(e) =>
                      setFieldValues({ ...fieldValues, crewAssigned: e.target.value })
                    }
                    placeholder="John's Team"
                    className="h-10"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleFieldSave('crewAssigned', fieldValues.crewAssigned)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEditing}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-accent"
                  onClick={() => startEditing('crewAssigned', job.crewAssigned)}
                >
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{job.crewAssigned || 'No crew assigned'}</span>
                  <Edit2 className="ml-auto h-3 w-3 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Payment Status */}
            <div>
              <Label className="text-sm text-muted-foreground">Payment Status</Label>
              {editingField === 'paymentStatus' ? (
                <div className="flex gap-2">
                  <Select
                    value={fieldValues.paymentStatus || 'NOT_PAID'}
                    onValueChange={(value) =>
                      setFieldValues({ ...fieldValues, paymentStatus: value })
                    }
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NOT_PAID">Not Paid</SelectItem>
                      <SelectItem value="DEPOSIT_PAID">Deposit Paid</SelectItem>
                      <SelectItem value="PAID_IN_FULL">Paid in Full</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={() =>
                      handleFieldSave('paymentStatus', fieldValues.paymentStatus)
                    }
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEditing}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-accent"
                  onClick={() => startEditing('paymentStatus', job.paymentStatus)}
                >
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {PAYMENT_STATUS_LABELS[
                      job.paymentStatus as keyof typeof PAYMENT_STATUS_LABELS
                    ] || 'Not Paid'}
                  </span>
                  <Edit2 className="ml-auto h-3 w-3 text-muted-foreground" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* QUOTE INFO (if quoted) */}
        {job.status === 'QUOTED' && (
          <Card>
            <CardHeader>
              <CardTitle>Quote Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Quote Amount</Label>
                <div className="text-2xl font-bold">
                  {formatCurrency(job.estimatedValue)}
                </div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Next Follow-up</Label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {job.nextFollowupDate
                      ? format(new Date(job.nextFollowupDate), 'MMM d, yyyy')
                      : 'No follow-up set'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* TIMELINE */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
          <CardDescription>All notes, calls, and status changes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Note */}
          <div className="flex gap-2">
            <Textarea
              placeholder="Add a quick note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={2}
              className="resize-none"
            />
            <Button
              onClick={handleAddNote}
              disabled={!newNote.trim() || createActivity.isPending}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Activities */}
          <div className="space-y-3">
            {job.activities.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">
                No activities yet
              </p>
            ) : (
              job.activities.map((activity: any) => (
                <div key={activity.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{activity.type}</Badge>
                        {activity.subject && (
                          <span className="text-sm font-medium">{activity.subject}</span>
                        )}
                      </div>
                      <p className="mt-2 text-sm">{activity.description}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{activity.owner?.user?.name || 'Unknown'}</span>
                    <span>•</span>
                    <span>
                      {format(new Date(activity.createdAt), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* PHOTOS - Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Photos</CardTitle>
          <CardDescription>Before, after, and progress photos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed">
            <div className="text-center">
              <Camera className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Photo upload coming soon
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
