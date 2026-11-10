import { z } from 'zod'
import type { SourceType, Sentiment, Status, Via } from './types'

export const sourceTypeSchema = z.enum([
  'customer_call',
  'sales_call',
  'churn_feedback',
  'support_ticket',
  'competitor',
  'community',
  'news',
  'other',
])

export const sentimentSchema = z.enum(['risk', 'opportunity', 'neutral'])
export const statusSchema = z.enum(['strong', 'emerging', 'weak', 'fading'])
export const viaSchema = z.enum(['claude', 'web'])

const isoDateNotFuture = z
  .string()
  .min(1)
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'observedAt must be a valid ISO date' })
  .refine((v) => new Date(v).getTime() <= Date.now() + 60_000, {
    message: 'observedAt cannot be in the future',
  })

export const themeCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
})

export const themeRenameSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
})

export const themeMergeSchema = z
  .object({
    sourceId: z.string().min(1),
    targetId: z.string().min(1),
  })
  .refine((v) => v.sourceId !== v.targetId, {
    message: 'sourceId and targetId must be different',
  })

const signalFields = {
  quote: z.string().trim().min(3).max(1000),
  summary: z.string().trim().min(1).max(160),
  sourceType: sourceTypeSchema,
  sourceDetail: z.string().trim().max(200).optional(),
  segment: z.string().trim().max(200).optional(),
  sentiment: sentimentSchema,
  observedAt: isoDateNotFuture.optional(),
}

export const signalCreateSchema = z
  .object({
    ...signalFields,
    themeId: z.string().min(1).optional(),
    newThemeName: z.string().trim().min(2).max(80).optional(),
  })
  .superRefine((val, ctx) => {
    const hasId = Boolean(val.themeId)
    const hasName = Boolean(val.newThemeName)
    if (hasId === hasName) {
      ctx.addIssue({
        code: 'custom',
        message: 'Provide exactly one of themeId or newThemeName',
        path: hasId ? ['newThemeName'] : ['themeId'],
      })
    }
  })

export const signalUpdateSchema = z
  .object({
    quote: z.string().trim().min(3).max(1000).optional(),
    summary: z.string().trim().min(1).max(160).optional(),
    sourceType: sourceTypeSchema.optional(),
    sourceDetail: z.string().trim().max(200).optional().nullable(),
    segment: z.string().trim().max(200).optional().nullable(),
    sentiment: sentimentSchema.optional(),
    observedAt: isoDateNotFuture.optional(),
    themeId: z.string().min(1).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' })

export const addSignalItemSchema = z
  .object({
    ...signalFields,
    themeId: z.string().min(1).optional(),
    newThemeName: z.string().trim().min(2).max(80).optional(),
  })
  .superRefine((val, ctx) => {
    const hasId = Boolean(val.themeId)
    const hasName = Boolean(val.newThemeName)
    if (hasId === hasName) {
      ctx.addIssue({
        code: 'custom',
        message: 'Provide exactly one of themeId or newThemeName',
        path: hasId ? ['newThemeName'] : ['themeId'],
      })
    }
  })

export const addSignalsMcpSchema = z.object({
  signals: z.array(addSignalItemSchema).min(1).max(20),
})

export const searchSignalsSchema = z.object({
  query: z.string().optional(),
  themeId: z.string().optional(),
  sourceType: sourceTypeSchema.optional(),
  sentiment: sentimentSchema.optional(),
})

export const getTrendsSchema = z.object({
  status: statusSchema.optional(),
})

export const themeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  createdAt: z.string(),
  createdVia: viaSchema,
})

export const signalSchema = z.object({
  id: z.string(),
  themeId: z.string(),
  quote: z.string(),
  summary: z.string(),
  sourceType: sourceTypeSchema,
  sourceDetail: z.string().optional(),
  segment: z.string().optional(),
  sentiment: sentimentSchema,
  observedAt: z.string(),
  via: viaSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const activitySchema = z.object({
  id: z.string(),
  text: z.string(),
  via: viaSchema,
  at: z.string(),
  themeId: z.string().optional(),
  statusChange: z
    .object({
      from: statusSchema,
      to: statusSchema,
    })
    .optional(),
})

export const storeDocumentSchema = z.object({
  version: z.number().int().nonnegative(),
  themes: z.array(themeSchema),
  signals: z.array(signalSchema),
  activity: z.array(activitySchema),
})

export type SignalCreateInput = z.infer<typeof signalCreateSchema>
export type SignalUpdateInput = z.infer<typeof signalUpdateSchema>
export type AddSignalItem = z.infer<typeof addSignalItemSchema>
export type ThemeCreateInput = z.infer<typeof themeCreateSchema>
export type SearchSignalsInput = z.infer<typeof searchSignalsSchema>

export type { SourceType, Sentiment, Status, Via }
