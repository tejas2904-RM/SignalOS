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

export type HypothesisStatus = 'open' | 'validated' | 'invalidated'
export type HypothesisStance = 'supports' | 'contradicts'

export type HypothesisLink = {
  signalId: string
  stance: HypothesisStance
}

export type Hypothesis = {
  id: string
  statement: string
  status: HypothesisStatus
  links: HypothesisLink[]
  createdAt: string
  updatedAt: string
}

export type ShareRecord = {
  slug: string
  themeId: string
  createdAt: string
}

export type StoreDocument = {
  version: number
  themes: Theme[]
  signals: Signal[]
  activity: Activity[]
  hypotheses: Hypothesis[]
  shares: ShareRecord[]
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

export type HypothesisVerdict = 'Leaning true' | 'Leaning false' | 'Inconclusive'

export type ScoredHypothesis = Hypothesis & {
  supportPct: number
  verdict: HypothesisVerdict
  linkCount: number
  supportWeight: number
  contradictWeight: number
}

export type ComputedState = {
  version: number
  themes: ScoredTheme[]
  signals: Signal[]
  activity: Activity[]
  hypotheses: ScoredHypothesis[]
  metrics: ComputedMetrics
}
