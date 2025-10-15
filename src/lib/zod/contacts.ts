import { z } from 'zod'

// Contact form schema for drawer validation
export const contactFormSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name must be less than 100 characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be less than 100 characters'),
  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),
  phone: z.string().optional(),
  ownerId: z.string().min(1, 'Owner is required'),
})

export type ContactFormData = z.infer<typeof contactFormSchema>

// Contact list filters schema
export const contactFiltersSchema = z.object({
  q: z.string().optional(), // Search query
  limit: z.number().min(1).max(100).default(25),
  cursor: z.string().optional(), // For keyset pagination (format: "updatedAt_id")
})

export type ContactFilters = z.infer<typeof contactFiltersSchema>

// Contact list response schema
export const contactListResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      email: z.string().nullable(),
      phone: z.string().nullable(),
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
  ),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
  total: z.number(),
})

export type ContactListResponse = z.infer<typeof contactListResponseSchema>

// Contact create/update schemas
export const createContactSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  ownerId: z.string().min(1),
})

export const updateContactSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
})

export type CreateContactData = z.infer<typeof createContactSchema>
export type UpdateContactData = z.infer<typeof updateContactSchema>