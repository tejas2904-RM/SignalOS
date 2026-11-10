import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { isAppError } from '@/lib/errors'
import { dashboardUrl, themeUrl } from '@/lib/app-url'
import {
  addSignalsMcpSchema,
  getTrendsSchema,
  searchSignalsSchema,
  sourceTypeSchema,
  sentimentSchema,
  statusSchema,
} from '@/lib/schemas'
import {
  addSignalsBatch,
  getComputedState,
  searchSignals,
} from '@/lib/store'
import type { ScoredTheme, Signal, Status } from '@/lib/types'

const SERVER_INSTRUCTIONS = `SignalOS stores market signals for a startup team. When the user shares notes or observations: ALWAYS call list_themes first; split the input into separate signals, each with a verbatim quote; reuse an existing theme when the meaning matches (even if worded differently) and create a new theme only if nothing fits; then call add_signals once with all of them. When answering questions, use get_trends / search_signals and quote stored evidence. Always share the dashboard link from the tool result.`

function textResult(payload: unknown, isError = false) {
  return {
    isError,
    content: [
      {
        type: 'text' as const,
        text: typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2),
      },
    ],
  }
}

function toolError(err: unknown) {
  if (isAppError(err)) return textResult(err.message, true)
  if (err instanceof z.ZodError) {
    return textResult(err.issues.map((i) => i.message).join('; ') || 'Validation failed', true)
  }
  console.error('[mcp]', err)
  return textResult(err instanceof Error ? err.message : 'Unexpected MCP tool error', true)
}

function capitalizeStatus(status: Status): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function topQuotes(theme: ScoredTheme, signals: Signal[], limit = 3): string[] {
  return signals
    .filter((s) => s.themeId === theme.id)
    .sort((a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime())
    .slice(0, limit)
    .map((s) => s.quote)
}

export function createSignalOsMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: 'SignalOS',
      version: '0.2.0',
    },
    {
      instructions: SERVER_INSTRUCTIONS,
    },
  )

  server.registerTool(
    'list_themes',
    {
      title: 'List themes',
      description:
        'List all market themes with status, polarity, counts, strength, velocity, and dashboard URLs. Call this first before adding signals.',
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      try {
        const state = await getComputedState()
        const themes = state.themes.map((t) => ({
          id: t.id,
          name: t.name,
          status: t.status,
          polarity: t.polarity,
          count: t.count,
          sources: t.sources,
          strength: t.strength,
          velocity: t.velocity,
          url: themeUrl(t.id),
        }))
        return textResult({
          dashboard: dashboardUrl(),
          themes,
        })
      } catch (err) {
        return toolError(err)
      }
    },
  )

  server.registerTool(
    'add_signals',
    {
      title: 'Add signals',
      description:
        'Add 1–20 market signals (via Claude). Provide exactly one of themeId or newThemeName per item. Reuses themes case-insensitively by name. Returns created signals, status changes, and URLs.',
      inputSchema: {
        signals: z
          .array(
            z
              .object({
                quote: z.string().trim().min(3).max(1000).describe('Verbatim quote from the source'),
                summary: z.string().trim().min(1).max(160).describe('Short summary ≤160 chars'),
                sourceType: sourceTypeSchema,
                sourceDetail: z.string().trim().max(200).optional(),
                segment: z.string().trim().max(200).optional(),
                sentiment: sentimentSchema,
                observedAt: z
                  .string()
                  .optional()
                  .describe('ISO date observed; defaults to now; cannot be future'),
                themeId: z.string().min(1).optional().describe('Existing theme id from list_themes'),
                newThemeName: z
                  .string()
                  .trim()
                  .min(2)
                  .max(80)
                  .optional()
                  .describe('Create or reuse theme by name if themeId omitted'),
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
              }),
          )
          .min(1)
          .max(20),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async (args) => {
      try {
        const parsed = addSignalsMcpSchema.parse(args)
        const result = await addSignalsBatch(parsed.signals, 'claude')
        const statusChanges = result.statusChanges.map(
          (c) => `${c.name}: ${capitalizeStatus(c.from)} → ${capitalizeStatus(c.to)}`,
        )
        const themeIds = [...new Set(result.created.map((s) => s.themeId))]
        return textResult({
          createdCount: result.created.length,
          created: result.created.map((s) => ({
            id: s.id,
            themeId: s.themeId,
            quote: s.quote,
            summary: s.summary,
            sourceType: s.sourceType,
            sentiment: s.sentiment,
            via: s.via,
          })),
          statusChanges,
          dashboard: dashboardUrl(),
          themeUrls: themeIds.map((id) => themeUrl(id)),
          message:
            statusChanges.length > 0
              ? `Saved ${result.created.length} signals. ${statusChanges.join('; ')}`
              : `Saved ${result.created.length} signals.`,
        })
      } catch (err) {
        return toolError(err)
      }
    },
  )

  server.registerTool(
    'search_signals',
    {
      title: 'Search signals',
      description:
        'Search stored signals by free text (quote/summary/detail/segment) and optional filters. Returns up to 25 matches.',
      inputSchema: {
        query: z.string().optional().describe('Case-insensitive text match'),
        themeId: z.string().optional(),
        sourceType: sourceTypeSchema.optional(),
        sentiment: sentimentSchema.optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => {
      try {
        const filters = searchSignalsSchema.parse(args ?? {})
        const matches = await searchSignals(filters)
        return textResult({
          count: matches.length,
          dashboard: dashboardUrl(),
          signals: matches,
        })
      } catch (err) {
        return toolError(err)
      }
    },
  )

  server.registerTool(
    'get_trends',
    {
      title: 'Get trends',
      description:
        'Return scored themes with reasons, nextStatusHint, and the top 3 recent quotes. Optionally filter by status.',
      inputSchema: {
        status: statusSchema.optional().describe('Optional status filter: strong|emerging|weak|fading'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => {
      try {
        const { status } = getTrendsSchema.parse(args ?? {})
        const state = await getComputedState()
        const themes = state.themes
          .filter((t) => (status ? t.status === status : true))
          .map((t) => ({
            id: t.id,
            name: t.name,
            status: t.status,
            polarity: t.polarity,
            count: t.count,
            sources: t.sources,
            strength: t.strength,
            velocity: t.velocity,
            reasons: t.reasons,
            nextStatusHint: t.nextStatusHint,
            topQuotes: topQuotes(t, state.signals, 3),
            url: themeUrl(t.id),
          }))
        return textResult({
          dashboard: dashboardUrl(),
          themes,
        })
      } catch (err) {
        return toolError(err)
      }
    },
  )

  return server
}
