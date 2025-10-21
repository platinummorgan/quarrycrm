import { z } from 'zod'

// Helpers
const zDate = z.union([
  z.date(),
  z.string().datetime().transform((s) => new Date(s)),
  z.string().transform((s) => new Date(s)), // tolerate plain strings
  z.number().transform((n) => new Date(n)), // tolerate epoch
])

// If your deal.value might ever be a string (Decimal/JSON), coerce it:
const zNumberish = z.preprocess((v) => (v === null || v === '' ? null : v), z.union([
  z.number(),
  z.string().transform((s) => Number(s)),
])).nullable()

// Base schemas
export const pipelineSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  isDefault: z.boolean().optional().default(false),
  stages: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      order: z.number(),
      color: z.string().nullable().optional(),
      // Make _count optional and default deals to 0 if omitted
      _count: z
        .object({
          deals: z.number(),
        })
        .partial()
        .optional()
        .transform((c) => ({ deals: c?.deals ?? 0 })),
    })
  ),
})

export const dealSchema = z.object({
  id: z.string(),
  title: z.string().nullable().optional(),
  value: zNumberish, // was z.number().nullable()
  probability: zNumberish, // tolerant; if you truly never send it, make it .nullable().optional()
  expectedClose: zDate.nullable().optional(),
  stage: z
    .object({
      id: z.string(),
      name: z.string(),
      color: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  pipeline: z.object({
    id: z.string(),
    name: z.string(),
  }),
  contact: z
    .object({
      id: z.string(),
      firstName: z.string().nullable().optional(),
      lastName: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  company: z
    .object({
      id: z.string(),
      name: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  owner: z.object({
    id: z.string(),
    user: z.object({
      id: z.string(),
      name: z.string().nullable().optional(),
      email: z.string().nullable().optional(), // be lenient; some seeds don’t set email
    }),
  }),
  updatedAt: zDate,
  createdAt: zDate,
})

// Form schemas
export const dealFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  value: zNumberish.optional(),
  probability: zNumberish.refine((v) => v == null || (v >= 0 && v <= 100), {
    message: 'Probability must be between 0 and 100',
  }).optional(),
  expectedClose: zDate.optional(),
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
  limit: z.coerce.number().min(1).max(100).default(25),
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
