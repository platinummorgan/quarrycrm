// src/lib/zod/deals.ts
import { z } from 'zod'

// helpers
const CoercedDate = z
  .union([z.date(), z.string(), z.number()])
  .transform((v) => (v instanceof Date ? v : new Date(v)))
  .refine((d) => !Number.isNaN(d.getTime()), { message: 'Invalid date' })

// ----- Pipeline / Stage -----
export const pipelineSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),       // often nullable/omitted
  isDefault: z.boolean().optional().default(false),     // some APIs omit this
  stages: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      order: z.number(),
      color: z.string().nullable().optional(),
      _count: z
        .object({
          deals: z.number().optional().default(0),
        })
        .optional()
        .default({ deals: 0 }),
    })
  ),
})

export const pipelinesListResponseSchema = z.array(pipelineSchema)

// ----- Deal -----
export const dealSchema = z.object({
  id: z.string(),
  title: z.string(),
  value: z.number().nullable().optional(),
  probability: z.number().nullable().optional(),        // tolerate missing
  expectedClose: z.union([CoercedDate, z.null()]).optional().nullable(),
  stage: z
    .object({
      id: z.string(),
      name: z.string(),
      color: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  pipeline: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .optional(),                                        // many list endpoints omit nested pipeline
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
      name: z.string(),
    })
    .nullable()
    .optional(),
  owner: z
    .object({
      id: z.string(),
      user: z.object({
        id: z.string(),
        name: z.string().nullable().optional(),
        email: z.string().nullable().optional(),         // can be null in seed/dev
      }),
    })
    .optional(),
  updatedAt: CoercedDate,
  createdAt: CoercedDate,
})

// ----- Forms / Filters -----
export const dealFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  value: z.coerce.number().min(0).optional(),
  probability: z.coerce.number().min(0).max(100).optional(),
  expectedClose: z
    .union([z.coerce.date(), z.string(), z.null()])
    .optional()
    .nullable(),
  stageId: z.string().optional(),
  pipelineId: z.string(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
})

export const moveDealSchema = z.object({
  dealId: z.string(),
  stageId: z.string(),
})

export const dealsFiltersSchema = z.object({
  pipeline: z.string().optional(),
  q: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(25),  // coerce from querystring
  cursor: z.string().optional(),
})

// ----- Responses / Types -----
export const dealsListResponseSchema = z.object({
  items: z.array(dealSchema),
  nextCursor: z.string().nullable().optional().default(null),
  hasMore: z.boolean().optional().default(false),
  total: z.number().optional().default(0),
})

export type Deal = z.infer<typeof dealSchema>
export type Pipeline = z.infer<typeof pipelineSchema>
export type DealFormData = z.infer<typeof dealFormSchema>
export type DealsListResponse = z.infer<typeof dealsListResponseSchema>
export type PipelinesListResponse = z.infer<typeof pipelinesListResponseSchema>
export type DealsFilters = z.infer<typeof dealsFiltersSchema>
export type MoveDealData = z.infer<typeof moveDealSchema>
