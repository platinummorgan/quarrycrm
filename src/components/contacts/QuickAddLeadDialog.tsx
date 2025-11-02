'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Button } from '@/components/ui/button'
import { trpc } from '@/lib/trpc'
import { useToast } from '@/hooks/use-toast'
import { Phone, MessageSquare, Save, Loader2 } from 'lucide-react'
import { addDays, format } from 'date-fns'

const LEAD_SOURCES = [
  { value: 'GOOGLE', label: 'Google' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'YARD_SIGN', label: 'Yard Sign' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'REPEAT_CUSTOMER', label: 'Repeat Customer' },
  { value: 'OTHER', label: 'Other' },
]

interface QuickAddLeadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickAddLeadDialog({
  open,
  onOpenChange,
}: QuickAddLeadDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  
  // Form fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [jobType, setJobType] = useState('')
  const [estimatedValue, setEstimatedValue] = useState('')
  const [leadSource, setLeadSource] = useState('REFERRAL')
  const [nextFollowupDate, setNextFollowupDate] = useState(
    format(addDays(new Date(), 2), 'yyyy-MM-dd')
  )
  const [notes, setNotes] = useState('')

  // Refs for auto-focus
  const phoneRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const jobTypeRef = useRef<HTMLInputElement>(null)

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFirstName('')
      setLastName('')
      setPhone('')
      setEmail('')
      setAddress('')
      setJobType('')
      setEstimatedValue('')
      setLeadSource('REFERRAL')
      setNextFollowupDate(format(addDays(new Date(), 2), 'yyyy-MM-dd'))
      setNotes('')
      setSaving(false)
    }
  }, [open])

  // Job type autocomplete - fetch from previous deals
  const jobTypesQuery = trpc.deals.list.useQuery(
    { limit: 100 },
    { 
      enabled: open,
      select: (data) => {
        // Extract unique job types
        const types = new Set<string>()
        data.items.forEach((deal: any) => {
          if (deal.jobType) types.add(deal.jobType)
        })
        return Array.from(types).slice(0, 10)
      }
    }
  )

  // Fetch pipelines to get default one
  const pipelinesQuery = trpc.pipelines.list.useQuery(undefined, {
    enabled: open,
  })

  const createContact = trpc.contacts.create.useMutation()
  const createDeal = trpc.deals.create.useMutation()

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length <= 3) return cleaned
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setPhone(formatted)
  }

  const validateForm = () => {
    if (!firstName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a first name',
        variant: 'destructive',
      })
      return false
    }
    if (!phone.trim()) {
      toast({
        title: 'Phone required',
        description: 'Please enter a phone number',
        variant: 'destructive',
      })
      return false
    }
    if (!jobType.trim()) {
      toast({
        title: 'Job type required',
        description: 'Please enter what work they need',
        variant: 'destructive',
      })
      return false
    }
    return true
  }

  const saveLead = async () => {
    if (!validateForm()) return null

    setSaving(true)

    try {
      // Get default pipeline
      const pipelinesData = pipelinesQuery.data
      const pipelines = pipelinesData && 'items' in pipelinesData ? pipelinesData.items : []
      
      if (pipelines.length === 0) {
        toast({
          title: 'No pipeline found',
          description: 'Please create a sales pipeline first',
          variant: 'destructive',
        })
        setSaving(false)
        return null
      }
      const defaultPipeline = pipelines[0]

      // Create contact
      const contact = await createContact.mutateAsync({
        firstName,
        lastName: lastName || '(no last name)',
        phone: phone.replace(/\D/g, ''),
        email: email || undefined,
      })

      // Create deal with job details
      const deal = await createDeal.mutateAsync({
        title: `${jobType} - ${firstName} ${lastName}`.trim(),
        contactId: contact.id,
        pipelineId: defaultPipeline.id,
        status: 'NEW',
        jobType,
        estimatedValue: estimatedValue ? parseFloat(estimatedValue) : undefined,
        leadSource: leadSource as any,
        value: estimatedValue ? parseFloat(estimatedValue) : undefined,
      })

      // If notes provided, create activity
      if (notes.trim()) {
        // TODO: Create activity with notes
      }

      toast({
        title: 'Lead saved!',
        description: `${firstName} has been added`,
      })

      return { contact, deal }
    } catch (error: any) {
      toast({
        title: 'Error saving lead',
        description: error.message,
        variant: 'destructive',
      })
      setSaving(false)
      return null
    }
  }

  const handleSaveAndCall = async () => {
    const result = await saveLead()
    if (result) {
      const cleanPhone = phone.replace(/\D/g, '')
      window.location.href = `tel:${cleanPhone}`
      onOpenChange(false)
      router.refresh()
    }
  }

  const handleSaveAndText = async () => {
    const result = await saveLead()
    if (result) {
      const cleanPhone = phone.replace(/\D/g, '')
      const message = encodeURIComponent(
        `Hi ${firstName}, this is from our earlier conversation about your ${jobType}. When would be a good time to discuss the project?`
      )
      window.location.href = `sms:${cleanPhone}?body=${message}`
      onOpenChange(false)
      router.refresh()
    }
  }

  const handleSaveOnly = async () => {
    const result = await saveLead()
    if (result) {
      onOpenChange(false)
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Add New Lead</DialogTitle>
          <DialogDescription>
            Quick lead capture - fill in what you know
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSaveOnly()
          }}
          className="space-y-4"
        >
          {/* Name Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-base">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                className="h-12 text-lg"
                autoComplete="given-name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    phoneRef.current?.focus()
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-base">
                Last Name
              </Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Smith"
                className="h-12 text-lg"
                autoComplete="family-name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    phoneRef.current?.focus()
                  }
                }}
              />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-base">
              Phone <span className="text-destructive">*</span>
            </Label>
            <Input
              id="phone"
              ref={phoneRef}
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="(555) 123-4567"
              className="h-12 text-lg"
              autoComplete="tel"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  emailRef.current?.focus()
                }
              }}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-base">
              Email
            </Label>
            <Input
              id="email"
              ref={emailRef}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              className="h-12 text-lg"
              autoComplete="email"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  jobTypeRef.current?.focus()
                }
              }}
            />
          </div>

          {/* Job Type */}
          <div className="space-y-2">
            <Label htmlFor="jobType" className="text-base">
              Job Type <span className="text-destructive">*</span>
            </Label>
            <Input
              id="jobType"
              ref={jobTypeRef}
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              placeholder="e.g., Roof Repair, Kitchen Remodel"
              className="h-12 text-lg"
              list="jobTypesList"
            />
            {jobTypesQuery.data && jobTypesQuery.data.length > 0 && (
              <datalist id="jobTypesList">
                {jobTypesQuery.data.map((type) => (
                  <option key={type} value={type} />
                ))}
              </datalist>
            )}
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address" className="text-base">
              Address
            </Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, City, State"
              className="h-12 text-lg"
              autoComplete="street-address"
            />
          </div>

          {/* Estimated Value & Lead Source Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="estimatedValue" className="text-base">
                Est. Value
              </Label>
              <Input
                id="estimatedValue"
                type="number"
                step="100"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                placeholder="5000"
                className="h-12 text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leadSource" className="text-base">
                Lead Source
              </Label>
              <Select value={leadSource} onValueChange={setLeadSource}>
                <SelectTrigger className="h-12 text-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map((source) => (
                    <SelectItem key={source.value} value={source.value} className="text-lg py-3">
                      {source.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Next Follow-up Date */}
          <div className="space-y-2">
            <Label htmlFor="followupDate" className="text-base">
              Next Follow-up
            </Label>
            <Input
              id="followupDate"
              type="date"
              value={nextFollowupDate}
              onChange={(e) => setNextFollowupDate(e.target.value)}
              className="h-12 text-lg"
            />
          </div>

          {/* Quick Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-base">
              Quick Notes
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any important details..."
              rows={3}
              className="text-lg resize-none"
            />
          </div>

          {/* Action Buttons - Mobile Optimized */}
          <div className="space-y-3 pt-4">
            <Button
              type="button"
              onClick={handleSaveAndCall}
              disabled={saving}
              className="w-full h-14 text-lg"
              size="lg"
            >
              {saving ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Phone className="mr-2 h-5 w-5" />
              )}
              Save & Call
            </Button>

            <Button
              type="button"
              onClick={handleSaveAndText}
              disabled={saving}
              className="w-full h-14 text-lg"
              variant="secondary"
              size="lg"
            >
              {saving ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <MessageSquare className="mr-2 h-5 w-5" />
              )}
              Save & Text
            </Button>

            <Button
              type="submit"
              disabled={saving}
              className="w-full h-14 text-lg"
              variant="outline"
              size="lg"
            >
              {saving ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Save className="mr-2 h-5 w-5" />
              )}
              Save Only
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
