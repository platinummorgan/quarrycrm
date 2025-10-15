import { z } from 'zod'

// Base schemas
export const pipelineSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isDefault: z.boolean(),
  stages: z.array(z.object({
    id: z.string(),
    name: z.string(),
    order: z.number(),
    color: z.string().nullable(),
    _count: z.object({
      deals: z.number(),
    }),
  })),
})

export const dealSchema = z.object({
  id: z.string(),
  title: z.string(),
  value: z.number().nullable(),
  probability: z.number().nullable(),
  expectedClose: z.date().nullable(),
  stage: z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().nullable(),
  }).nullable(),
  pipeline: z.object({
    id: z.string(),
    name: z.string(),
  }),
  contact: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().nullable(),
  }).nullable(),
  company: z.object({
    id: z.string(),
    name: z.string(),
  }).nullable(),
  owner: z.object({
    id: z.string(),
    user: z.object({
      id: z.string(),
      name: z.string().nullable(),
      email: z.string(),
    }),
  }),
  updatedAt: z.date(),
  createdAt: z.date(),
})

// Form schemas
export const dealFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  value: z.number().min(0).optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedClose: z.date().optional(),
  stageId: z.string().optional(),
  pipelineId: z.string(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
})

export const moveDealSchema = z.object({
  dealId: z.string(),
  stageId: z.string(),
})

// Filter schemas
export const dealsFiltersSchema = z.object({
  pipeline: z.string().optional(),
  q: z.string().optional(),
  limit: z.number().min(1).max(100).default(25),
  cursor: z.string().optional(),
})

// Response schemas
export const dealsListResponseSchema = z.object({
  items: z.array(dealSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
  total: z.number(),
})

export const pipelinesListResponseSchema = z.array(pipelineSchema)

// Type exports
export type Deal = z.infer<typeof dealSchema>
export type Pipeline = z.infer<typeof pipelineSchema>
export type DealFormData = z.infer<typeof dealFormSchema>
export type DealsListResponse = z.infer<typeof dealsListResponseSchema>
export type PipelinesListResponse = z.infer<typeof pipelinesListResponseSchema>
export type DealsFilters = z.infer<typeof dealsFiltersSchema>
export type MoveDealData = z.infer<typeof moveDealSchema>