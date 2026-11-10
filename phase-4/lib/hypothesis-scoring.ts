import { ageDays } from './scoring'
import { getSourceMeta } from './source-meta'
import type {
  Hypothesis,
  HypothesisVerdict,
  ScoredHypothesis,
  Signal,
} from './types'

function linkWeight(signal: Signal, now: Date): number {
  const weight = getSourceMeta(signal.sourceType).weight
  const recency = 0.5 ** (ageDays(signal.observedAt, now) / 30)
  return weight * recency
}

export function scoreHypothesis(
  hypothesis: Hypothesis,
  signals: Signal[],
  now: Date = new Date(),
): ScoredHypothesis {
  const byId = new Map(signals.map((s) => [s.id, s]))
  let supportWeight = 0
  let contradictWeight = 0
  let linkCount = 0

  for (const link of hypothesis.links) {
    const signal = byId.get(link.signalId)
    if (!signal) continue
    linkCount += 1
    const w = linkWeight(signal, now)
    if (link.stance === 'supports') supportWeight += w
    else contradictWeight += w
  }

  const total = supportWeight + contradictWeight
  const supportPct = total === 0 ? 0 : Math.round((supportWeight / total) * 1000) / 10

  let verdict: HypothesisVerdict = 'Inconclusive'
  if (linkCount >= 3 && supportPct >= 70) verdict = 'Leaning true'
  else if (total > 0 && supportPct <= 30) verdict = 'Leaning false'

  return {
    ...hypothesis,
    supportPct,
    verdict,
    linkCount,
    supportWeight: Math.round(supportWeight * 10) / 10,
    contradictWeight: Math.round(contradictWeight * 10) / 10,
  }
}

export function scoreAllHypotheses(
  hypotheses: Hypothesis[],
  signals: Signal[],
  now: Date = new Date(),
): ScoredHypothesis[] {
  return hypotheses.map((h) => scoreHypothesis(h, signals, now))
}
