export type SourceType =
  | 'customer_call'
  | 'sales_call'
  | 'churn_feedback'
  | 'support_ticket'
  | 'competitor'
  | 'community'
  | 'news'
  | 'other'

export type Sentiment = 'risk' | 'opportunity' | 'neutral'
export type Status = 'strong' | 'emerging' | 'weak' | 'fading'
export type Via = 'claude' | 'web'
export type Polarity = 'Risk' | 'Opportunity' | 'Neutral'

export type Theme = {
  id: string
  name: string
  description?: string
  createdAt: string
  createdVia: Via
}

export type Signal = {
  id: string
  themeId: string
  quote: string
  summary: string
  sourceType: SourceType
  sourceDetail?: string
  segment?: string
  sentiment: Sentiment
  observedAt: string
  via: Via
  createdAt: string
  updatedAt: string
}

export type Activity = {
  id: string
  text: string
  via: Via
  at: string
  themeId?: string
  statusChange?: { from: Status; to: Status }
}

export type StoreDocument = {
  version: number
  themes: Theme[]
  signals: Signal[]
  activity: Activity[]
}

export type StatusReason = {
  label: string
  met: boolean
  value: string
}

export type ScoredTheme = Theme & {
  status: Status
  polarity: Polarity
  strength: number
  count: number
  sources: number
  velocity: number
  last14: number
  prev14: number
  weeklyCounts: number[]
  reasons: StatusReason[]
  nextStatusHint: string
  topQuote?: string
  latestVia?: Via
}

export type StatusChange = {
  themeId: string
  name: string
  from: Status
  to: Status
}

export type ComputedMetrics = {
  signalsThisWeek: number
  emergingThemes: number
  avgSourcesPerEmerging: number
  pctViaClaude: number
}

export type ComputedState = {
  version: number
  themes: ScoredTheme[]
  signals: Signal[]
  activity: Activity[]
  metrics: ComputedMetrics
}
