import { z } from 'zod'

// Organization schemas
export const OrganizationSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1),
  domain: z.string().url().optional(),
  description: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const CreateOrganizationSchema = OrganizationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export const UpdateOrganizationSchema = CreateOrganizationSchema.partial()

// User schemas
export const UserSchema = z.object({
  id: z.string().cuid(),
  email: z.string().email(),
  name: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const CreateUserSchema = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export const UpdateUserSchema = CreateUserSchema.partial()

// Org Member schemas
export const OrgMemberRoleSchema = z.enum(['OWNER', 'ADMIN', 'MEMBER'])

export const OrgMemberSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string().cuid(),
  userId: z.string().cuid(),
  role: OrgMemberRoleSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const CreateOrgMemberSchema = OrgMemberSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export const UpdateOrgMemberSchema = CreateOrgMemberSchema.partial()

// Contact schemas
export const ContactSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string().cuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  companyId: z.string().cuid().optional(),
  ownerId: z.string().cuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional(),
})

export const CreateContactSchema = ContactSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export const UpdateContactSchema = CreateContactSchema.partial()

// Company schemas
export const CompanySchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string().cuid(),
  name: z.string().min(1),
  website: z.string().url().optional(),
  industry: z.string().optional(),
  description: z.string().optional(),
  domain: z.string().optional(),
  ownerId: z.string().cuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional(),
})

export const CreateCompanySchema = CompanySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export const UpdateCompanySchema = CreateCompanySchema.partial()

// Pipeline schemas
export const PipelineSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string().cuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  isDefault: z.boolean(),
  ownerId: z.string().cuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional(),
})

export const CreatePipelineSchema = PipelineSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export const UpdatePipelineSchema = CreatePipelineSchema.partial()

// Stage schemas
export const StageSchema = z.object({
  id: z.string().cuid(),
  pipelineId: z.string().cuid(),
  name: z.string().min(1),
  order: z.number().int().positive(),
  color: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const CreateStageSchema = StageSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export const UpdateStageSchema = CreateStageSchema.partial()

// Deal schemas
export const DealSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string().cuid(),
  title: z.string().min(1),
  value: z.number().positive().optional(),
  stageId: z.string().cuid().optional(),
  pipelineId: z.string().cuid(),
  contactId: z.string().cuid().optional(),
  companyId: z.string().cuid().optional(),
  ownerId: z.string().cuid(),
  expectedClose: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional(),
})

export const CreateDealSchema = DealSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export const UpdateDealSchema = CreateDealSchema.partial()

// Activity schemas
export const ActivityTypeSchema = z.enum([
  'CALL',
  'EMAIL',
  'MEETING',
  'NOTE',
  'TASK',
])

export const ActivitySchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string().cuid(),
  type: ActivityTypeSchema,
  description: z.string().min(1),
  contactId: z.string().cuid().optional(),
  dealId: z.string().cuid().optional(),
  ownerId: z.string().cuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional(),
})

export const CreateActivitySchema = ActivitySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export const UpdateActivitySchema = CreateActivitySchema.partial()

// Webhook schemas
export const WebhookSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string().cuid(),
  url: z.string().url(),
  secret: z.string().min(1),
  events: z.array(z.string()),
  isActive: z.boolean(),
  ownerId: z.string().cuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional(),
})

export const CreateWebhookSchema = WebhookSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export const UpdateWebhookSchema = CreateWebhookSchema.partial()

// Event Audit schemas
export const EventAuditSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string().cuid(),
  eventType: z.string().min(1),
  eventData: z.record(z.any()),
  userId: z.string().cuid().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  createdAt: z.date(),
})

export const CreateEventAuditSchema = EventAuditSchema.omit({
  id: true,
  createdAt: true,
})

// Export types
export type Organization = z.infer<typeof OrganizationSchema>
export type CreateOrganization = z.infer<typeof CreateOrganizationSchema>
export type UpdateOrganization = z.infer<typeof UpdateOrganizationSchema>

export type User = z.infer<typeof UserSchema>
export type CreateUser = z.infer<typeof CreateUserSchema>
export type UpdateUser = z.infer<typeof UpdateUserSchema>

export type OrgMember = z.infer<typeof OrgMemberSchema>
export type CreateOrgMember = z.infer<typeof CreateOrgMemberSchema>
export type UpdateOrgMember = z.infer<typeof UpdateOrgMemberSchema>
export type OrgMemberRole = z.infer<typeof OrgMemberRoleSchema>

export type Contact = z.infer<typeof ContactSchema>
export type CreateContact = z.infer<typeof CreateContactSchema>
export type UpdateContact = z.infer<typeof UpdateContactSchema>

export type Company = z.infer<typeof CompanySchema>
export type CreateCompany = z.infer<typeof CreateCompanySchema>
export type UpdateCompany = z.infer<typeof UpdateCompanySchema>

export type Pipeline = z.infer<typeof PipelineSchema>
export type CreatePipeline = z.infer<typeof CreatePipelineSchema>
export type UpdatePipeline = z.infer<typeof UpdatePipelineSchema>

export type Stage = z.infer<typeof StageSchema>
export type CreateStage = z.infer<typeof CreateStageSchema>
export type UpdateStage = z.infer<typeof UpdateStageSchema>

export type Deal = z.infer<typeof DealSchema>
export type CreateDeal = z.infer<typeof CreateDealSchema>
export type UpdateDeal = z.infer<typeof UpdateDealSchema>

export type Activity = z.infer<typeof ActivitySchema>
export type CreateActivity = z.infer<typeof CreateActivitySchema>
export type UpdateActivity = z.infer<typeof UpdateActivitySchema>
export type ActivityType = z.infer<typeof ActivityTypeSchema>

export type Webhook = z.infer<typeof WebhookSchema>
export type CreateWebhook = z.infer<typeof CreateWebhookSchema>
export type UpdateWebhook = z.infer<typeof UpdateWebhookSchema>

export type EventAudit = z.infer<typeof EventAuditSchema>
export type CreateEventAudit = z.infer<typeof CreateEventAuditSchema>
