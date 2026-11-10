import { Redis } from '@upstash/redis'
import { storeDocumentSchema } from './schemas'
import { buildSeedData } from './seed'
import { detectStatusChanges, scoreAllThemes } from './scoring'
import { AppError } from './errors'
import type {
  Activity,
  ComputedState,
  ScoredTheme,
  Signal,
  StatusChange,
  StoreDocument,
  Theme,
  Via,
} from './types'
import type { AddSignalItem, SearchSignalsInput, SignalUpdateInput, ThemeCreateInput } from './schemas'

export const REDIS_KEY = 'signalos:data'
const MAX_ACTIVITY = 100
const CAS_RETRIES = 3

type MutationResult = {
  state: ComputedState
  statusChanges: StatusChange[]
}

type AddSignalsResult = MutationResult & {
  created: Signal[]
  themesCreated: Theme[]
}

let memoryDoc: StoreDocument | null = null

function redisConfigured(): boolean {
  return Boolean(
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
      (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
  )
}

function getRedis(): Redis | null {
  if (!redisConfigured()) return null
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL!
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN!
  return new Redis({ url, token })
}

function newId(): string {
  return crypto.randomUUID()
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

function computeState(doc: StoreDocument, now = new Date()): ComputedState {
  const themes = scoreAllThemes(doc.themes, doc.signals, now)
  const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000
  const signalsThisWeek = doc.signals.filter(
    (s) => new Date(s.createdAt).getTime() >= weekAgo || new Date(s.observedAt).getTime() >= weekAgo,
  ).length
  const emerging = themes.filter((t) => t.status === 'emerging')
  const avgSourcesPerEmerging =
    emerging.length === 0
      ? 0
      : Math.round(
          (emerging.reduce((sum, t) => sum + t.sources, 0) / emerging.length) * 10,
        ) / 10
  const viaClaude = doc.signals.filter((s) => s.via === 'claude').length
  const pctViaClaude =
    doc.signals.length === 0 ? 0 : Math.round((viaClaude / doc.signals.length) * 1000) / 10

  return {
    version: doc.version,
    themes,
    signals: doc.signals,
    activity: doc.activity.slice(0, 50),
    metrics: {
      signalsThisWeek,
      emergingThemes: emerging.length,
      avgSourcesPerEmerging,
      pctViaClaude,
    },
  }
}

function pushActivity(doc: StoreDocument, entry: Omit<Activity, 'id' | 'at'> & { at?: string }) {
  doc.activity.unshift({
    id: newId(),
    at: entry.at ?? new Date().toISOString(),
    text: entry.text,
    via: entry.via,
    themeId: entry.themeId,
    statusChange: entry.statusChange,
  })
  if (doc.activity.length > MAX_ACTIVITY) {
    doc.activity = doc.activity.slice(0, MAX_ACTIVITY)
  }
}

function findThemeByName(doc: StoreDocument, name: string): Theme | undefined {
  const key = normalizeName(name)
  return doc.themes.find((t) => normalizeName(t.name) === key)
}

async function loadRaw(): Promise<StoreDocument | null> {
  const redis = getRedis()
  if (!redis) {
    return memoryDoc
  }
  const raw = await redis.get<StoreDocument | string>(REDIS_KEY)
  if (raw == null) return null
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as StoreDocument
    } catch {
      return null
    }
  }
  return raw
}

async function saveCas(expectedVersion: number, nextDoc: StoreDocument): Promise<boolean> {
  const redis = getRedis()
  const payload = { ...nextDoc, version: expectedVersion + 1 }

  if (!redis) {
    if (memoryDoc && memoryDoc.version !== expectedVersion) return false
    if (!memoryDoc && expectedVersion !== 0) return false
    memoryDoc = payload
    return true
  }

  // Lua: write only if missing (expected 0) or version matches
  const script = `
    local key = KEYS[1]
    local expected = tonumber(ARGV[1])
    local payload = ARGV[2]
    local current = redis.call('GET', key)
    if not current then
      if expected ~= 0 then
        return 0
      end
      redis.call('SET', key, payload)
      return 1
    end
    local ok, doc = pcall(cjson.decode, current)
    if not ok then
      return 0
    end
    if tonumber(doc['version']) ~= expected then
      return 0
    end
    redis.call('SET', key, payload)
    return 1
  `

  const result = await redis.eval(script, [REDIS_KEY], [expectedVersion, JSON.stringify(payload)])
  return result === 1 || result === '1'
}

async function forceWrite(doc: StoreDocument): Promise<void> {
  const redis = getRedis()
  if (!redis) {
    memoryDoc = doc
    return
  }
  await redis.set(REDIS_KEY, JSON.stringify(doc))
}

async function loadOrHeal(): Promise<StoreDocument> {
  const raw = await loadRaw()
  if (raw) {
    const parsed = storeDocumentSchema.safeParse(raw)
    if (parsed.success) return parsed.data
    console.warn('[signalos] Invalid store document — reseeding')
  } else {
    console.warn('[signalos] Missing store document — seeding')
  }
  const seeded = buildSeedData()
  await forceWrite(seeded)
  return seeded
}

async function mutate(
  fn: (
    doc: StoreDocument,
    beforeThemes: ScoredTheme[],
  ) => { doc: StoreDocument; statusChanges?: StatusChange[]; extra?: Record<string, unknown> },
): Promise<MutationResult & Record<string, unknown>> {
  let lastError: unknown
  for (let attempt = 0; attempt < CAS_RETRIES; attempt++) {
    const current = await loadOrHeal()
    const beforeThemes = scoreAllThemes(current.themes, current.signals)
    const working: StoreDocument = {
      version: current.version,
      themes: structuredClone(current.themes),
      signals: structuredClone(current.signals),
      activity: structuredClone(current.activity),
    }
    const result = fn(working, beforeThemes)
    const ok = await saveCas(current.version, result.doc)
    if (ok) {
      const state = computeState({ ...result.doc, version: current.version + 1 })
      return {
        state,
        statusChanges: result.statusChanges ?? [],
        ...result.extra,
      }
    }
    lastError = new AppError('VERSION_CONFLICT', 'Concurrent update — please retry', 409)
  }
  throw lastError instanceof AppError
    ? lastError
    : new AppError('VERSION_CONFLICT', 'Concurrent update — please retry', 409)
}

function appendStatusChangeActivity(
  doc: StoreDocument,
  changes: StatusChange[],
  via: Via,
) {
  for (const change of changes) {
    pushActivity(doc, {
      via,
      themeId: change.themeId,
      text: `${change.name}: ${capitalize(change.from)} → ${capitalize(change.to)}`,
      statusChange: { from: change.from, to: change.to },
    })
  }
}

function capitalize(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function resolveThemeId(
  doc: StoreDocument,
  input: { themeId?: string; newThemeName?: string },
  via: Via,
  themesCreated: Theme[],
): string {
  if (input.themeId) {
    const theme = doc.themes.find((t) => t.id === input.themeId)
    if (!theme) {
      throw new AppError('THEME_NOT_FOUND', 'themeId not found. Call list_themes first.', 404)
    }
    return theme.id
  }
  const name = input.newThemeName!.trim()
  const existing = findThemeByName(doc, name)
  if (existing) return existing.id
  const theme: Theme = {
    id: newId(),
    name,
    createdAt: new Date().toISOString(),
    createdVia: via,
  }
  doc.themes.push(theme)
  themesCreated.push(theme)
  pushActivity(doc, { via, themeId: theme.id, text: `Created theme “${theme.name}”` })
  return theme.id
}

export async function getComputedState(): Promise<ComputedState> {
  const doc = await loadOrHeal()
  return computeState(doc)
}

export async function getHealth(): Promise<{ ok: true; signals: number; version: number }> {
  const doc = await loadOrHeal()
  return { ok: true, signals: doc.signals.length, version: doc.version }
}

export async function resetDemo(): Promise<ComputedState> {
  const seeded = buildSeedData()
  await forceWrite(seeded)
  return computeState(seeded)
}

export async function createTheme(input: ThemeCreateInput, via: Via): Promise<Theme> {
  const result = await mutate((doc) => {
    if (findThemeByName(doc, input.name)) {
      throw new AppError('THEME_EXISTS', `Theme “${input.name.trim()}” already exists`, 409)
    }
    const theme: Theme = {
      id: newId(),
      name: input.name.trim(),
      description: input.description?.trim() || undefined,
      createdAt: new Date().toISOString(),
      createdVia: via,
    }
    doc.themes.push(theme)
    pushActivity(doc, { via, themeId: theme.id, text: `Created theme “${theme.name}”` })
    return { doc, extra: { theme } }
  })
  return result.theme as Theme
}

export async function renameTheme(
  id: string,
  input: { name: string; description?: string },
  via: Via,
): Promise<Theme> {
  const result = await mutate((doc) => {
    const theme = doc.themes.find((t) => t.id === id)
    if (!theme) throw new AppError('THEME_NOT_FOUND', 'Theme not found', 404)
    const clash = findThemeByName(doc, input.name)
    if (clash && clash.id !== id) {
      throw new AppError('THEME_EXISTS', `Theme “${input.name.trim()}” already exists`, 409)
    }
    theme.name = input.name.trim()
    if (input.description !== undefined) {
      theme.description = input.description.trim() || undefined
    }
    pushActivity(doc, { via, themeId: theme.id, text: `Renamed theme to “${theme.name}”` })
    return { doc, extra: { theme: { ...theme } } }
  })
  return result.theme as Theme
}

export async function deleteTheme(id: string, via: Via): Promise<void> {
  await mutate((doc) => {
    const theme = doc.themes.find((t) => t.id === id)
    if (!theme) throw new AppError('THEME_NOT_FOUND', 'Theme not found', 404)
    const hasSignals = doc.signals.some((s) => s.themeId === id)
    if (hasSignals) {
      throw new AppError(
        'THEME_NOT_EMPTY',
        'Cannot delete a theme that still has signals. Move or delete signals first.',
        409,
      )
    }
    doc.themes = doc.themes.filter((t) => t.id !== id)
    pushActivity(doc, { via, text: `Deleted theme “${theme.name}”` })
    return { doc }
  })
}

export async function mergeThemes(
  sourceId: string,
  targetId: string,
  via: Via,
): Promise<{ targetId: string }> {
  if (sourceId === targetId) {
    throw new AppError('INVALID_MERGE', 'sourceId and targetId must be different', 400)
  }
  await mutate((doc, beforeThemes) => {
    const source = doc.themes.find((t) => t.id === sourceId)
    const target = doc.themes.find((t) => t.id === targetId)
    if (!source || !target) {
      throw new AppError('THEME_NOT_FOUND', 'sourceId or targetId not found', 404)
    }
    for (const signal of doc.signals) {
      if (signal.themeId === sourceId) {
        signal.themeId = targetId
        signal.updatedAt = new Date().toISOString()
      }
    }
    doc.themes = doc.themes.filter((t) => t.id !== sourceId)
    pushActivity(doc, {
      via,
      themeId: targetId,
      text: `Merged “${source.name}” into “${target.name}”`,
    })
    const afterThemes = scoreAllThemes(doc.themes, doc.signals)
    const statusChanges = detectStatusChanges(beforeThemes, afterThemes)
    appendStatusChangeActivity(doc, statusChanges, via)
    return { doc, statusChanges }
  })
  return { targetId }
}

export async function createSignal(
  input: {
    quote: string
    summary: string
    sourceType: Signal['sourceType']
    sourceDetail?: string
    segment?: string
    sentiment: Signal['sentiment']
    observedAt?: string
    themeId?: string
    newThemeName?: string
  },
  via: Via,
): Promise<MutationResult & { signal: Signal }> {
  const batch = await addSignalsBatch([input], via)
  return {
    state: batch.state,
    statusChanges: batch.statusChanges,
    signal: batch.created[0],
  }
}

export async function updateSignal(
  id: string,
  patch: SignalUpdateInput,
  via: Via,
): Promise<MutationResult & { signal: Signal }> {
  const result = await mutate((doc, beforeThemes) => {
    const signal = doc.signals.find((s) => s.id === id)
    if (!signal) throw new AppError('SIGNAL_NOT_FOUND', 'Signal not found', 404)
    if (patch.themeId) {
      const theme = doc.themes.find((t) => t.id === patch.themeId)
      if (!theme) throw new AppError('THEME_NOT_FOUND', 'themeId not found', 404)
      signal.themeId = patch.themeId
    }
    if (patch.quote !== undefined) signal.quote = patch.quote
    if (patch.summary !== undefined) signal.summary = patch.summary
    if (patch.sourceType !== undefined) signal.sourceType = patch.sourceType
    if (patch.sourceDetail !== undefined) {
      signal.sourceDetail = patch.sourceDetail ?? undefined
    }
    if (patch.segment !== undefined) signal.segment = patch.segment ?? undefined
    if (patch.sentiment !== undefined) signal.sentiment = patch.sentiment
    if (patch.observedAt !== undefined) signal.observedAt = patch.observedAt
    signal.updatedAt = new Date().toISOString()
    pushActivity(doc, {
      via,
      themeId: signal.themeId,
      text: `Updated signal on theme`,
    })
    const afterThemes = scoreAllThemes(doc.themes, doc.signals)
    const statusChanges = detectStatusChanges(beforeThemes, afterThemes)
    appendStatusChangeActivity(doc, statusChanges, via)
    return { doc, statusChanges, extra: { signal: { ...signal } } }
  })
  return {
    state: result.state,
    statusChanges: result.statusChanges,
    signal: result.signal as Signal,
  }
}

export async function deleteSignal(id: string, via: Via): Promise<MutationResult> {
  return mutate((doc, beforeThemes) => {
    const signal = doc.signals.find((s) => s.id === id)
    if (!signal) throw new AppError('SIGNAL_NOT_FOUND', 'Signal not found', 404)
    doc.signals = doc.signals.filter((s) => s.id !== id)
    pushActivity(doc, {
      via,
      themeId: signal.themeId,
      text: `Deleted a signal`,
    })
    const afterThemes = scoreAllThemes(doc.themes, doc.signals)
    const statusChanges = detectStatusChanges(beforeThemes, afterThemes)
    appendStatusChangeActivity(doc, statusChanges, via)
    return { doc, statusChanges }
  })
}

export async function addSignalsBatch(
  items: AddSignalItem[],
  via: Via,
): Promise<AddSignalsResult> {
  const result = await mutate((doc, beforeThemes) => {
    const created: Signal[] = []
    const themesCreated: Theme[] = []
    const nowIso = new Date().toISOString()

    for (const item of items) {
      const themeId = resolveThemeId(
        doc,
        { themeId: item.themeId, newThemeName: item.newThemeName },
        via,
        themesCreated,
      )
      const signal: Signal = {
        id: newId(),
        themeId,
        quote: item.quote.trim(),
        summary: item.summary.trim(),
        sourceType: item.sourceType,
        sourceDetail: item.sourceDetail?.trim() || undefined,
        segment: item.segment?.trim() || undefined,
        sentiment: item.sentiment,
        observedAt: item.observedAt ?? nowIso,
        via,
        createdAt: nowIso,
        updatedAt: nowIso,
      }
      doc.signals.push(signal)
      created.push(signal)
    }

    pushActivity(doc, {
      via,
      text:
        via === 'claude'
          ? `Claude added ${created.length} signal${created.length === 1 ? '' : 's'}`
          : `Added ${created.length} signal${created.length === 1 ? '' : 's'}`,
    })

    const afterThemes = scoreAllThemes(doc.themes, doc.signals)
    const statusChanges = detectStatusChanges(beforeThemes, afterThemes)
    appendStatusChangeActivity(doc, statusChanges, via)
    return { doc, statusChanges, extra: { created, themesCreated } }
  })

  return {
    state: result.state,
    statusChanges: result.statusChanges,
    created: result.created as Signal[],
    themesCreated: (result.themesCreated as Theme[]) ?? [],
  }
}

export async function searchSignals(filters: SearchSignalsInput): Promise<Signal[]> {
  const doc = await loadOrHeal()
  const q = filters.query?.trim().toLowerCase()
  const matches = doc.signals.filter((s) => {
    if (filters.themeId && s.themeId !== filters.themeId) return false
    if (filters.sourceType && s.sourceType !== filters.sourceType) return false
    if (filters.sentiment && s.sentiment !== filters.sentiment) return false
    if (q) {
      const hay = [s.quote, s.summary, s.sourceDetail ?? '', s.segment ?? '']
        .join(' ')
        .toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
  return matches.slice(0, 25)
}

/** Test helper: clear in-memory store */
export function __resetMemoryStore(): void {
  memoryDoc = null
}
