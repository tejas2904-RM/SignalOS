import type { SourceType } from './types'

export type SourceMeta = {
  type: SourceType
  weight: number
  label: string
  icon: string
  color: string
}

export const SOURCE_META: Record<SourceType, SourceMeta> = {
  customer_call: {
    type: 'customer_call',
    weight: 1.0,
    label: 'Customer call',
    icon: 'Phone',
    color: '#10B981',
  },
  sales_call: {
    type: 'sales_call',
    weight: 1.0,
    label: 'Sales call',
    icon: 'Headset',
    color: '#3B82F6',
  },
  churn_feedback: {
    type: 'churn_feedback',
    weight: 1.0,
    label: 'Churn feedback',
    icon: 'UserMinus',
    color: '#F43F5E',
  },
  support_ticket: {
    type: 'support_ticket',
    weight: 0.8,
    label: 'Support ticket',
    icon: 'Ticket',
    color: '#F59E0B',
  },
  competitor: {
    type: 'competitor',
    weight: 0.6,
    label: 'Competitor',
    icon: 'Swords',
    color: '#A855F7',
  },
  community: {
    type: 'community',
    weight: 0.5,
    label: 'Community',
    icon: 'MessagesSquare',
    color: '#06B6D4',
  },
  news: {
    type: 'news',
    weight: 0.3,
    label: 'News',
    icon: 'Newspaper',
    color: '#8A8F98',
  },
  other: {
    type: 'other',
    weight: 0.4,
    label: 'Other',
    icon: 'Circle',
    color: '#71717A',
  },
}

export const SOURCE_WEIGHTS: Record<SourceType, number> = Object.fromEntries(
  Object.entries(SOURCE_META).map(([k, v]) => [k, v.weight]),
) as Record<SourceType, number>

export const SOURCE_OPTIONS = Object.values(SOURCE_META)

export function getSourceMeta(type: SourceType): SourceMeta {
  return SOURCE_META[type]
}
