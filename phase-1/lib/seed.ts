import { scoreAllThemes } from './scoring'
import type { Signal, Status, StoreDocument, Theme, Via } from './types'

function daysAgo(now: Date, days: number): string {
  const d = new Date(now)
  d.setTime(d.getTime() - days * 24 * 60 * 60 * 1000)
  return d.toISOString()
}

function id(prefix: string, n: number): string {
  return `${prefix}-${n}`
}

type SeedSignal = Omit<Signal, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }

function makeSignal(
  now: Date,
  partial: SeedSignal & { id: string },
): Signal {
  const createdAt = partial.observedAt
  return {
    ...partial,
    createdAt,
    updatedAt: createdAt,
  }
}

export const THEME_NAMES = {
  reimbursements: 'Manual reimbursements take too long',
  multiCurrency: 'Exporters want multi-currency cards',
  accountingSync: 'Accounting-software sync keeps breaking',
  gst: 'GST input credit lost on missing invoices',
  upi: 'Interest in UPI corporate payments',
} as const

export function buildSeedData(now: Date = new Date()): StoreDocument {
  const themes: Theme[] = [
    {
      id: id('theme', 1),
      name: THEME_NAMES.reimbursements,
      description: 'Employees wait weeks for out-of-pocket expense payouts.',
      createdAt: daysAgo(now, 60),
      createdVia: 'web',
    },
    {
      id: id('theme', 2),
      name: THEME_NAMES.multiCurrency,
      description: 'Export-heavy SMBs want cards that settle in USD/EUR.',
      createdAt: daysAgo(now, 20),
      createdVia: 'claude',
    },
    {
      id: id('theme', 3),
      name: THEME_NAMES.accountingSync,
      description: 'Tally / Zoho Books sync failures create manual work.',
      createdAt: daysAgo(now, 25),
      createdVia: 'web',
    },
    {
      id: id('theme', 4),
      name: THEME_NAMES.gst,
      description: 'Missing vendor invoices block GST input credit.',
      createdAt: daysAgo(now, 8),
      createdVia: 'claude',
    },
    {
      id: id('theme', 5),
      name: THEME_NAMES.upi,
      description: 'Curiosity about corporate UPI, but interest cooled.',
      createdAt: daysAgo(now, 55),
      createdVia: 'web',
    },
  ]

  const [t1, t2, t3, t4, t5] = themes

  const raw: Array<SeedSignal & { id: string }> = [
    // Strong: reimbursements — 8 signals, 3+ source types, recent
    {
      id: id('sig', 1),
      themeId: t1.id,
      quote: 'Finance still takes 18 days to reimburse field staff after a trip.',
      summary: 'Slow reimbursement cycle for field teams',
      sourceType: 'customer_call',
      sourceDetail: 'Discovery call',
      segment: 'Ops lead, 55-person logistics firm, Jaipur',
      sentiment: 'opportunity',
      observedAt: daysAgo(now, 3),
      via: 'claude',
    },
    {
      id: id('sig', 2),
      themeId: t1.id,
      quote: 'People float personal money for client dinners and hate chasing accounts.',
      summary: 'Personal float for expenses',
      sourceType: 'sales_call',
      segment: 'Founder, 30-person agency, Bengaluru',
      sentiment: 'opportunity',
      observedAt: daysAgo(now, 5),
      via: 'web',
    },
    {
      id: id('sig', 3),
      themeId: t1.id,
      quote: 'We churned because reimbursements were a monthly fight with finance.',
      summary: 'Churn tied to reimbursement pain',
      sourceType: 'churn_feedback',
      segment: 'Ex-customer CSM note, Pune',
      sentiment: 'risk',
      observedAt: daysAgo(now, 7),
      via: 'claude',
    },
    {
      id: id('sig', 4),
      themeId: t1.id,
      quote: 'Ticket queue is full of “where is my reimbursement?” every Friday.',
      summary: 'Support load from payout delays',
      sourceType: 'support_ticket',
      sourceDetail: '#4821',
      segment: 'Mid-market SaaS, Hyderabad',
      sentiment: 'risk',
      observedAt: daysAgo(now, 2),
      via: 'web',
    },
    {
      id: id('sig', 5),
      themeId: t1.id,
      quote: 'Managers approve claims in WhatsApp because the portal is too slow.',
      summary: 'Offline approvals workaround',
      sourceType: 'customer_call',
      segment: 'Finance lead, 40-person D2C brand, Pune',
      sentiment: 'opportunity',
      observedAt: daysAgo(now, 9),
      via: 'claude',
    },
    {
      id: id('sig', 6),
      themeId: t1.id,
      quote: 'Reddit thread: Indian startups dumping Excel reimbursement sheets.',
      summary: 'Community frustration with Excel flows',
      sourceType: 'community',
      sourceDetail: 'r/developersIndia anecdote',
      sentiment: 'opportunity',
      observedAt: daysAgo(now, 4),
      via: 'web',
    },
    {
      id: id('sig', 7),
      themeId: t1.id,
      quote: 'Sales said instant cards would kill 80% of reimbursement tickets.',
      summary: 'Cards as reimbursement alternative',
      sourceType: 'sales_call',
      segment: 'AE notes, Delhi NCR',
      sentiment: 'opportunity',
      observedAt: daysAgo(now, 11),
      via: 'claude',
    },
    {
      id: id('sig', 8),
      themeId: t1.id,
      quote: 'Employees threaten to stop client travel until payouts catch up.',
      summary: 'Travel blocked by unpaid claims',
      sourceType: 'customer_call',
      segment: 'HRBP, 70-person manufacturer, Coimbatore',
      sentiment: 'risk',
      observedAt: daysAgo(now, 1),
      via: 'web',
    },

    // Emerging: multi-currency — 3 signals, 2 types, last14
    {
      id: id('sig', 9),
      themeId: t2.id,
      quote: 'We invoice in USD but the team pays vendors in INR — FX cards would help.',
      summary: 'USD receivables vs INR spend',
      sourceType: 'customer_call',
      segment: 'CFO, export unit, Surat',
      sentiment: 'opportunity',
      observedAt: daysAgo(now, 4),
      via: 'claude',
    },
    {
      id: id('sig', 10),
      themeId: t2.id,
      quote: 'Prospect asked for multi-currency virtual cards in the first demo.',
      summary: 'Multi-currency asked in demo',
      sourceType: 'sales_call',
      segment: 'Prospect, 25-person exporter, Mumbai',
      sentiment: 'opportunity',
      observedAt: daysAgo(now, 6),
      via: 'web',
    },
    {
      id: id('sig', 11),
      themeId: t2.id,
      quote: 'Competitor launched EUR cards last week; our export leads noticed.',
      summary: 'Competitor EUR card launch',
      sourceType: 'competitor',
      sentiment: 'risk',
      observedAt: daysAgo(now, 8),
      via: 'claude',
    },

    // Emerging: accounting sync — 3 signals, 2 types, Risk
    {
      id: id('sig', 12),
      themeId: t3.id,
      quote: 'Tally sync failed three nights in a row; books were off by ₹2L.',
      summary: 'Tally sync overnight failures',
      sourceType: 'support_ticket',
      sourceDetail: '#5102',
      segment: 'Controller, 45-person distributor, Ahmedabad',
      sentiment: 'risk',
      observedAt: daysAgo(now, 5),
      via: 'web',
    },
    {
      id: id('sig', 13),
      themeId: t3.id,
      quote: 'Zoho Books mapping keeps dropping cost centres after every update.',
      summary: 'Zoho cost centre mapping breaks',
      sourceType: 'customer_call',
      segment: 'Accountant, 20-person studio, Chennai',
      sentiment: 'risk',
      observedAt: daysAgo(now, 9),
      via: 'claude',
    },
    {
      id: id('sig', 14),
      themeId: t3.id,
      quote: 'We almost churned after month-end close slipped due to sync errors.',
      summary: 'Churn risk from sync at month-end',
      sourceType: 'churn_feedback',
      segment: 'CS note, Indore',
      sentiment: 'risk',
      observedAt: daysAgo(now, 12),
      via: 'web',
    },

    // Weak: GST — exactly 2 sales_call within last 10 days
    {
      id: id('sig', 15),
      themeId: t4.id,
      quote: 'Vendors email invoices late and we lose GST input credit every month.',
      summary: 'Late vendor invoices → lost ITC',
      sourceType: 'sales_call',
      segment: 'Finance manager, small manufacturing, Nashik',
      sentiment: 'opportunity',
      observedAt: daysAgo(now, 4),
      via: 'claude',
    },
    {
      id: id('sig', 16),
      themeId: t4.id,
      quote: 'Missing invoices mean we cannot claim GST; finance chases vendors manually.',
      summary: 'Manual chase for missing invoices',
      sourceType: 'sales_call',
      segment: 'Finance manager, 40-person manufacturer, Nagpur',
      sentiment: 'opportunity',
      observedAt: daysAgo(now, 7),
      via: 'web',
    },

    // Fading: UPI — 2 signals, 40+ days old
    {
      id: id('sig', 17),
      themeId: t5.id,
      quote: 'Curious about corporate UPI for vendor payouts, but not urgent.',
      summary: 'Soft interest in corporate UPI',
      sourceType: 'customer_call',
      segment: 'Owner, wholesale trader, Lucknow',
      sentiment: 'opportunity',
      observedAt: daysAgo(now, 42),
      via: 'claude',
    },
    {
      id: id('sig', 18),
      themeId: t5.id,
      quote: 'News piece on UPI for businesses; no inbound from our ICP since.',
      summary: 'UPI news without ICP follow-through',
      sourceType: 'news',
      sentiment: 'neutral',
      observedAt: daysAgo(now, 48),
      via: 'web',
    },
  ]

  const signals = raw.map((r) => makeSignal(now, r))
  const viaClaude = signals.filter((s) => s.via === 'claude').length
  if (viaClaude < 7 || viaClaude > 11) {
    // soft check — seed aims for ~half of 18
  }

  const doc: StoreDocument = {
    version: 1,
    themes,
    signals,
    activity: [
      {
        id: id('act', 1),
        text: 'Demo workspace seeded with illustrative Indian SMB spend signals',
        via: 'web' as Via,
        at: now.toISOString(),
      },
    ],
  }

  assertSeedStatuses(doc, now)
  return doc
}

const EXPECTED: Record<string, Status> = {
  [THEME_NAMES.reimbursements]: 'strong',
  [THEME_NAMES.multiCurrency]: 'emerging',
  [THEME_NAMES.accountingSync]: 'emerging',
  [THEME_NAMES.gst]: 'weak',
  [THEME_NAMES.upi]: 'fading',
}

export function assertSeedStatuses(doc: StoreDocument, now: Date = new Date()): void {
  const scored = scoreAllThemes(doc.themes, doc.signals, now)
  for (const theme of scored) {
    const expected = EXPECTED[theme.name]
    if (!expected) {
      throw new Error(`Unexpected seed theme: ${theme.name}`)
    }
    if (theme.status !== expected) {
      throw new Error(
        `Seed status mismatch for "${theme.name}": expected ${expected}, got ${theme.status} ` +
          `(count=${theme.count}, sources=${theme.sources}, last14=${theme.last14}, prev14=${theme.prev14})`,
      )
    }
  }
  if (doc.signals.length < 16) {
    throw new Error(`Expected ~18 seed signals, got ${doc.signals.length}`)
  }
}
