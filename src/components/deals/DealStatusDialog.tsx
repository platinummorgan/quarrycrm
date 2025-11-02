'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/lib/trpc'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

const LEAD_STATUS_LABELS = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUOTED: 'Quoted',
  WON: 'Won',
  LOST: 'Lost',
}

const LEAD_SOURCE_LABELS = {
  GOOGLE: 'Google',
  REFERRAL: 'Referral',
  YARD_SIGN: 'Yard Sign',
  FACEBOOK: 'Facebook',
  REPEAT_CUSTOMER: 'Repeat Customer',
  OTHER: 'Other',
}

const STATUS_COLORS = {
  NEW: 'bg-blue-500',
  CONTACTED: 'bg-yellow-500',
  QUOTED: 'bg-purple-500',
  WON: 'bg-green-500',
  LOST: 'bg-gray-500',
}

interface DealStatusDialogProps {
  dealId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  currentStatus?: string
  currentJobType?: string
  currentEstimatedValue?: number
  currentLeadSource?: string
}

export function DealStatusDialog({
  dealId,
  open,
  onOpenChange,
  currentStatus = 'NEW',
  currentJobType = '',
  currentEstimatedValue = 0,
  currentLeadSource,
}: DealStatusDialogProps) {
  const { toast } = useToast()
  const [status, setStatus] = useState(currentStatus)
  const [jobType, setJobType] = useState(currentJobType)
  const [estimatedValue, setEstimatedValue] = useState(
    currentEstimatedValue?.toString() || ''
  )
  const [leadSource, setLeadSource] = useState(currentLeadSource || '')

  const utils = trpc.useUtils()
  const updateDeal = trpc.deals.update.useMutation({
    onSuccess: () => {
      toast({
        title: 'Lead updated',
        description: 'Status and details have been saved',
      })
      utils.deals.invalidate()
      onOpenChange(false)
    },
    onError: (error) => {
      toast({
        title: 'Error updating lead',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateDeal.mutate({
      id: dealId,
      data: {
        status: status as 'NEW' | 'CONTACTED' | 'QUOTED' | 'WON' | 'LOST',
        jobType: jobType || null,
        estimatedValue: estimatedValue ? parseFloat(estimatedValue) : null,
        leadSource: leadSource as any || null,
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Update Lead Details</DialogTitle>
          <DialogDescription>
            Change the status and update lead information
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          STATUS_COLORS[value as keyof typeof STATUS_COLORS]
                        }`}
                      />
                      {label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="jobType">Job Type</Label>
            <Input
              id="jobType"
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              placeholder="e.g., Roof Repair, Kitchen Remodel"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedValue">Estimated Value</Label>
            <Input
              id="estimatedValue"
              type="number"
              step="0.01"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="leadSource">Lead Source</Label>
            <Select value={leadSource} onValueChange={setLeadSource}>
              <SelectTrigger>
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateDeal.isPending}>
              {updateDeal.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      className={`${
        STATUS_COLORS[status as keyof typeof STATUS_COLORS]
      } text-white`}
    >
      {LEAD_STATUS_LABELS[status as keyof typeof LEAD_STATUS_LABELS] || status}
    </Badge>
  )
}
