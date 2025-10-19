'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { trpc } from '@/lib/trpc'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus } from 'lucide-react'

const createDealSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  value: z.number().positive().optional(),
  probability: z.number().min(0).max(100).default(0),
  expectedClose: z.string().optional(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
})

type CreateDealForm = z.infer<typeof createDealSchema>

interface QuickCreateDealProps {
  pipelineId?: string
  defaultStageId?: string
  onSuccess?: () => void
  trigger?: React.ReactNode
}

export function QuickCreateDeal({
  pipelineId,
  defaultStageId,
  onSuccess,
  trigger,
}: QuickCreateDealProps) {
  const [open, setOpen] = useState(false)

  const form = useForm<CreateDealForm>({
    resolver: zodResolver(createDealSchema),
    defaultValues: {
      probability: 0,
    },
  })

  // Fetch contacts for dropdown
  const { data: contacts } = trpc.contacts.list.useQuery({
    limit: 50,
  })

  // Fetch companies for dropdown
  const { data: companies } = trpc.companies.list.useQuery({
    limit: 50,
  })

  // Fetch pipelines if not provided
  const { data: pipelinesData } = trpc.pipelines.list.useQuery()
  const pipelines = pipelinesData?.items || []

  // Find selected pipeline
  const selectedPipeline = pipelineId
    ? pipelines.find((p) => p.id === pipelineId)
    : pipelines.find((p) => p.isDefault) || pipelines[0]

  // Get stages from selected pipeline
  const stages = selectedPipeline?.stages || []

  // Default stage is the first stage or the provided defaultStageId
  const defaultStage = defaultStageId
    ? stages.find((s) => s.id === defaultStageId)
    : stages[0]

  const createDealMutation = trpc.deals.create.useMutation({
    onSuccess: () => {
      setOpen(false)
      form.reset()
      onSuccess?.()
    },
  })

  const onSubmit = (data: CreateDealForm) => {
    if (!selectedPipeline) return

    createDealMutation.mutate({
      title: data.title,
      value: data.value,
      probability: data.probability,
      expectedClose: data.expectedClose
        ? new Date(data.expectedClose)
        : undefined,
      stageId: defaultStage?.id,
      pipelineId: selectedPipeline.id,
      contactId: data.contactId || undefined,
      companyId: data.companyId || undefined,
    })
  }

  const defaultTrigger = (
    <Button size="sm">
      <Plus className="mr-2 h-4 w-4" />
      New Deal
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Deal</DialogTitle>
          <DialogDescription>
            Add a new deal to your pipeline. It will be placed in the first
            stage by default.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Deal Title</label>
            <Input
              placeholder="Enter deal title..."
              {...form.register('title')}
            />
            {form.formState.errors.title && (
              <p className="mt-1 text-sm text-red-500">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Value ($)</label>
              <Input
                type="number"
                placeholder="10000"
                {...form.register('value', {
                  setValueAs: (value) => (value ? Number(value) : undefined),
                })}
              />
              {form.formState.errors.value && (
                <p className="mt-1 text-sm text-red-500">
                  {form.formState.errors.value.message}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Probability (%)</label>
              <Input
                type="number"
                placeholder="50"
                {...form.register('probability', {
                  setValueAs: (value) => Number(value),
                })}
              />
              {form.formState.errors.probability && (
                <p className="mt-1 text-sm text-red-500">
                  {form.formState.errors.probability.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Expected Close Date</label>
            <Input type="date" {...form.register('expectedClose')} />
            {form.formState.errors.expectedClose && (
              <p className="mt-1 text-sm text-red-500">
                {form.formState.errors.expectedClose.message}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Contact</label>
            <Select
              onValueChange={(value) => form.setValue('contactId', value)}
              value={form.watch('contactId')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a contact..." />
              </SelectTrigger>
              <SelectContent>
                {contacts?.items.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.firstName} {contact.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.contactId && (
              <p className="mt-1 text-sm text-red-500">
                {form.formState.errors.contactId.message}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Company</label>
            <Select
              onValueChange={(value) => form.setValue('companyId', value)}
              value={form.watch('companyId')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a company..." />
              </SelectTrigger>
              <SelectContent>
                {companies?.items.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.companyId && (
              <p className="mt-1 text-sm text-red-500">
                {form.formState.errors.companyId.message}
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createDealMutation.isLoading}>
              {createDealMutation.isLoading ? 'Creating...' : 'Create Deal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
