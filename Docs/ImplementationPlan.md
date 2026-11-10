# SignalOS — Detailed Implementation Plan

> Executable build plan from `ArchitecturePlan.md` + `ProblemStatment.md`.  
> Work top-to-bottom. After each phase, **stop** and run that phase’s test steps before continuing.  
> Do not add features outside the problem statement.

---

## How to use this plan

- Each task has: **files**, **exact work**, **depends on**, **done when**.
- Prefer small vertical slices that compile and run after each major task.
- Time boxes match the assignment (~2–3 hours total). Cut polish, never cut MCP or scoring correctness.
- Env needed early: Upstash Redis locally (or Vercel Storage after first deploy). For Phase 1 local-only, a Redis-backed mock or real Upstash REST credentials in `.env.local`.

**Forbidden packages** (must never appear in `package.json` dependencies):  
`openai`, `@anthropic-ai/sdk`, `anthropic`, `@google/generative-ai`, `cohere-ai`, `ai`, `langchain`, `@langchain/*`, `llamaindex`, `@pinecone-database/pinecone`.

---

## Global type contracts (implement once, reuse everywhere)

```ts
type SourceType =
  | 'customer_call' | 'sales_call' | 'churn_feedback' | 'support_ticket'
  | 'competitor' | 'community' | 'news' | 'other'

type Sentiment = 'risk' | 'opportunity' | 'neutral'
type Status = 'strong' | 'emerging' | 'weak' | 'fading'
type Via = 'claude' | 'web'

type Theme = {
  id: string
  name: string
  description?: string
  createdAt: string
  createdVia: Via
}

type Signal = {
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

type Activity = {
  id: string
  text: string
  via: Via
  at: string
  themeId?: string
  statusChange?: { from: Status; to: Status }
}

type StoreDocument = {
  version: number
  themes: Theme[]
  signals: Signal[]
  activity: Activity[]
}
```

**Source weights:**  
customer_call 1.0 · sales_call 1.0 · churn_feedback 1.0 · support_ticket 0.8 · competitor 0.6 · community 0.5 · news 0.3 · other 0.4.

---

# PHASE 1 — Foundation (~45 min)

**Outcome:** Plain board + working APIs + correct scoring + seed. No premium UI.

---

## Task 1.0 — Scaffold project

**Files:** repo root, `package.json`, `app/`, `tsconfig.json`, Tailwind config  
**Depends on:** none

### Steps
1. Create Next.js app (App Router, TypeScript, Tailwind, ESLint) in the workspace root (or `apps/web` only if you already have a monorepo — default: root).
2. Install runtime deps:
   - `@upstash/redis`, `zod`, `swr`, `geist`, `lucide-react`
   - Phase 3 can add `motion`, `sonner`, shadcn later if time-pressed; preferred: install now.
3. Add scripts:
   ```json
   {
     "check:no-ai": "node scripts/check-no-ai.mjs",
     "test": "vitest run",
     "smoke": "node scripts/smoke.mjs"
   }
   ```
4. Create `scripts/check-no-ai.mjs`: read `package.json` → `dependencies` (+ optionally `optionalDependencies`); exit 1 if any forbidden package name matches (including `@langchain/` prefix).
5. Create `.env.local.example` documenting:
   - `KV_REST_API_URL` / `KV_REST_API_TOKEN` **or**
   - `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
   - `NEXT_PUBLIC_APP_URL` (used for MCP tool links)
6. Wire Geist Sans + Geist Mono in `app/layout.tsx` via `geist` or `next/font`.
7. Add CSS variables to `app/globals.css` (full token table from problem §5) even if unused visually yet.

**Done when:** `npm run check:no-ai` passes; `npm run dev` serves a blank page with dark `--bg`.

---

## Task 1.1 — `lib/source-meta.ts`

**Depends on:** 1.0

### Implement
- Map each `SourceType` → `{ weight, label, icon /* lucide name */, color /* hex or CSS var */ }`.
- Export helpers: `getSourceMeta(type)`, `SOURCE_WEIGHTS`, ordered list for selects.

**Done when:** importing the module returns weights matching the problem statement.

---

## Task 1.2 — `lib/schemas.ts` (zod)

**Depends on:** 1.0, types above

### Schemas to export
| Schema | Rules |
|---|---|
| `sourceTypeSchema` | enum |
| `sentimentSchema` | enum |
| `themeCreateSchema` | name 2–80 trimmed; optional description |
| `themeRenameSchema` | name 2–80 |
| `themeMergeSchema` | `sourceId`, `targetId` |
| `signalCreateSchema` | quote 3–1000; summary ≤ 160; enums; optional detail/segment; `observedAt` ISO date, **not future**; themeId or newThemeName (API may split) |
| `signalUpdateSchema` | partial of create fields |
| `addSignalsMcpSchema` | array 1–20; each item: exactly one of `themeId` / `newThemeName`; same field limits |
| `searchSignalsSchema` | optional query/themeId/sourceType/sentiment |
| `getTrendsSchema` | optional status |
| `storeDocumentSchema` | version + arrays (for self-heal validation) |

**Done when:** invalid quote length / future date / both themeId+newThemeName fail with clear messages.

---

## Task 1.3 — `lib/scoring.ts` (pure)

**Depends on:** 1.1

### Functions (suggested API)

```ts
scoreTheme(theme: Theme, signals: Signal[], now?: Date): ScoredTheme
scoreAllThemes(themes: Theme[], signals: Signal[], now?: Date): ScoredTheme[]
detectStatusChanges(before: ScoredTheme[], after: ScoredTheme[]): StatusChange[]
```

### Per-theme computation
1. Filter signals by `themeId`.
2. `ageDays = (now − observedAt) / 1 day` (floor or fractional — pick fractional; be consistent).
3. `recency = 0.5 ** (ageDays / 30)`.
4. `strength = round1(Σ weight(sourceType) * recency)`.
5. `count = signals.length`.
6. `sources = distinct sourceType count`.
7. `last14` = count where ageDays ≤ 14; `prev14` = ageDays in (14, 28].
8. `velocity = last14 − prev14`.
9. `polarity` = majority sentiment → Risk / Opportunity / Neutral (tie → Neutral or majority with stable tie-break; document choice — prefer Neutral on tie).
10. `weeklyCounts`: last 8 weeks buckets (oldest → newest) for sparklines.
11. **Status** (evaluate in order):
    - **Fading** if no signal with ageDays ≤ 30
    - **Strong** if count ≥ 8 AND sources ≥ 3
    - **Emerging** if count ≥ 3 AND sources ≥ 2 AND last14 ≥ 1 AND last14 ≥ prev14
    - **Weak** otherwise
12. `reasons: { label, met, value }[]` checklist for current status (and/or for Emerging/Strong gates as specified).
13. `nextStatusHint: string` e.g. *"1 more signal from a new source type → Emerging"*.

### Tests (`lib/scoring.test.ts` with vitest)
- Fading when all signals > 30 days.
- Strong when ≥8 signals and ≥3 sources.
- Emerging gate (count/sources/velocity).
- Weak catch-all.
- **GST scenario:** 2 sales_call (≤10d) → Weak; add 2 customer_call → Emerging.
- Strength rounding to 1 decimal.

**Done when:** `npm test` green for scoring.

---

## Task 1.4 — `lib/seed.ts`

**Depends on:** 1.2, 1.3

### Story
Spend management for Indian SMBs. Anonymised roles/cities. Relative dates from `now`. ~18 signals. ~half `via: 'claude'`.

| Theme | Target | Build recipe |
|---|---|---|
| Manual reimbursements take too long | **Strong** | ≥8 signals, ≥3 source types, recent |
| Exporters want multi-currency cards | **Emerging** | 3 signals, 2 types, last14 activity |
| Accounting-software sync keeps breaking | **Emerging** | 3 signals, 2 types, Risk polarity |
| GST input credit lost on missing invoices | **Weak** | **exactly 2** `sales_call`, both within last 10 days, Opportunity |
| Interest in UPI corporate payments | **Fading** | 2 signals, observedAt ≥ 40 days ago |

### Implement
```ts
buildSeedData(now?: Date): StoreDocument
assertSeedStatuses(doc: StoreDocument, now?: Date): void  // throws if targets wrong
```

Call `assertSeedStatuses` at module load in test, and once inside `buildSeedData` in non-production or always (cheap).

**Done when:** asserting seed statuses passes; GST is Weak.

---

## Task 1.5 — `lib/store.ts` (sole mutation surface)

**Depends on:** 1.2–1.4, Upstash credentials

### Redis helpers
- Client from env (`KV_*` or `UPSTASH_*`).
- Key: `signalos:data`.
- `loadRaw()` / `saveCas(expectedVersion, nextDoc)`.

### CAS write (required)
Use Upstash `EVAL` Lua script:
- `GET` key → parse JSON → if `version !== expected` return fail.
- Else set document with `version: expected + 1`.
- JS wrapper: retry up to **3** times (re-read, re-apply mutation).

### Self-heal
- Missing key or `storeDocumentSchema` fail → `buildSeedData()`, write, `console.warn`.

### Public API (minimum)

```ts
getComputedState(): Promise<ComputedState>  // themes scored, signals, activity (last N), metrics, version
createSignal(input, via: Via): Promise<MutationResult>
updateSignal(id, patch, via): Promise<MutationResult>
deleteSignal(id, via): Promise<MutationResult>
createTheme(input, via): Promise<Theme>
renameTheme(id, name, via): Promise<Theme>
mergeThemes(sourceId, targetId, via): Promise<{ targetId }>
deleteTheme(id, via): Promise<void>  // throw if signals remain
addSignalsBatch(items, via: 'claude'): Promise<AddSignalsResult>  // for MCP
resetDemo(): Promise<ComputedState>
getHealth(): Promise<{ ok: true; signals: number; version: number }>
searchSignals(filters): Promise<Signal[]>
```

### Integrity (enforce here, not in UI)
- Theme names unique (trim, case-insensitive).
- `themeId` must exist.
- Delete theme blocked if any signals.
- Merge: reassign all signals → delete source theme → activity entry.
- On signal add/update that changes theme scores: append `activity` with `statusChange` when status differs.
- IDs: `crypto.randomUUID()` (or nanoid — either fine).

### `ComputedState` shape (for `/api/state`)
```ts
{
  version: number
  themes: ScoredTheme[]  // includes reasons, nextStatusHint, weeklyCounts, etc.
  signals: Signal[]
  activity: Activity[]   // e.g. last 50 stored; UI shows 12
  metrics: {
    signalsThisWeek: number
    emergingThemes: number
    avgSourcesPerEmerging: number
    pctViaClaude: number
  }
}
```

**Done when:** manual script or temporary route can reset, read state, and see 5 themes with correct statuses.

---

## Task 1.6 — API routes

**Depends on:** 1.5

| File | Methods | Behaviour |
|---|---|---|
| `app/api/state/route.ts` | GET | `getComputedState()`; header `Cache-Control: no-store` |
| `app/api/health/route.ts` | GET | `getHealth()` |
| `app/api/reset/route.ts` | POST | `resetDemo()` |
| `app/api/signals/route.ts` | POST | create (`via: 'web'`); zod validate |
| `app/api/signals/[id]/route.ts` | PATCH, DELETE | update/delete |
| `app/api/themes/route.ts` | POST | create theme |
| `app/api/themes/[id]/route.ts` | PATCH, DELETE | rename / delete |
| `app/api/themes/merge/route.ts` | POST | merge body `{ sourceId, targetId }` |

### Error helper
```ts
jsonError(code: string, message: string, status: number)
// body: { error: { code, message } }
```
Map zod → 400; not found → 404; integrity → 409; unexpected → 500.

**Done when:** curl/fetch:
1. `GET /api/health` → ok  
2. `POST /api/reset` → GST Weak in `GET /api/state`  
3. Create signal on GST with `customer_call` twice → status Emerging  

---

## Task 1.7 — Plain proof UI

**Files:** `app/page.tsx`, maybe `components/PlainBoard.tsx`  
**Depends on:** 1.6

### Steps
1. Client component: SWR `'/api/state'` (interval optional for now).
2. Render 4 columns Strong / Emerging / Weak / Fading listing theme names + status.
3. Confirm GST under Weak.

**Done when:** visual confirmation of seed layout.

---

## Phase 1 — Stop and test

```text
1. npm run check:no-ai
2. npm test
3. Fill .env.local with Upstash REST creds
4. npm run dev
5. GET http://localhost:3000/api/health
6. POST http://localhost:3000/api/reset
7. GET http://localhost:3000/api/state → verify 5 themes & GST Weak
8. Open / → four columns; GST in Weak
```

**Do not start Phase 2 until the above passes.**

---

# PHASE 2 — MCP + Deploy (~40 min)

**Outcome:** Live URL; Claude connector writes signals; GST flips on production.

---

## Task 2.1 — MCP route + 4 tools

**Files:** `app/api/[transport]/route.ts`, optionally `lib/mcp/tools.ts`, `lib/mcp/server.ts`  
**Depends on:** Phase 1 complete

### Transport
- Prefer `@modelcontextprotocol/sdk` with Streamable HTTP on Vercel.
- URL: `https://<app>.vercel.app/api/mcp` (and local `http://localhost:3000/api/mcp`).
- **No auth.**
- If evaluating `mcp-handler`: run `check:no-ai` after install; drop it if it pulls `ai`.

### Server instructions (set on server)
> SignalOS stores market signals… ALWAYS call `list_themes` first; split into separate signals with verbatim quotes; reuse themes by meaning; create new only if nothing fits; then `add_signals` once. For questions use `get_trends` / `search_signals` and quote evidence. Always share dashboard link from tool result.

### Tool implementations

#### `list_themes` `{}` — readOnlyHint
- Call store computed themes.
- Return: id, name, status, polarity, count, sources, strength, velocity, `url` (`${APP_URL}/themes/${id}`).

#### `add_signals` — write
- Validate with `addSignalsMcpSchema`.
- For each item: resolve theme by `themeId` or find-or-create by `newThemeName` (case-insensitive reuse).
- Snapshot scored statuses **before**.
- `addSignalsBatch(..., 'claude')`.
- Snapshot **after**; compute status changes.
- Return: created signals, status change strings (`"GST…: Weak → Emerging"`), dashboard URL, theme URLs.
- Errors: `"themeId not found. Call list_themes first."`

#### `search_signals` — readOnlyHint
- Filters; case-insensitive match on quote, summary, detail, segment; max 25.

#### `get_trends` — readOnlyHint
- Optional status filter; full scoring + reasons + top 3 quotes per theme (by recency or strength contribution).

**Done when:** tools register and call store without duplicating business logic.

---

## Task 2.2 — Local MCP verification

**Depends on:** 2.1

```text
1. npm run dev
2. npx @modelcontextprotocol/inspector
3. Connect to http://localhost:3000/api/mcp
4. Call list_themes → see GST Weak
5. Call add_signals with 2 customer_call quotes on GST themeId
6. Call list_themes → GST Emerging
7. Reset via POST /api/reset for a clean demo
```

---

## Task 2.3 — `scripts/smoke.mjs`

**Depends on:** 2.1

- Arg: base URL (e.g. `https://xxx.vercel.app` or `http://localhost:3000`).
- Hit health; then exercise MCP HTTP for each tool once (or call store via HTTP wrappers if MCP client is heavy — prefer real MCP calls).
- Exit non-zero on failure.

**Done when:** `npm run smoke -- http://localhost:3000` passes.

---

## Task 2.4 — Deploy to Vercel

**Depends on:** 2.1–2.3 local green

### Steps
1. Init git if needed; push to GitHub.
2. Import project on Vercel.
3. Vercel → Storage → Create Upstash Redis; ensure env vars present on the project.
4. Set `NEXT_PUBLIC_APP_URL` to the production URL.
5. Deploy.
6. Verify:
   - `GET https://<app>.vercel.app/api/health`
   - `GET https://<app>.vercel.app/api/state`
   - `npm run smoke -- https://<app>.vercel.app`
7. Claude → Settings / Customize → Connectors → Add custom connector:
   - Name: **SignalOS**
   - URL: `https://<app>.vercel.app/api/mcp`
8. In a chat: `+` → Connectors → enable SignalOS.
9. Paste GST demo notes (problem statement example prompt #1).
10. Confirm reply reports Weak → Emerging; open live dashboard within 3s (even with plain UI / manual refresh) and see GST in Emerging.

### Write down for README later
- Live app URL  
- MCP URL  
- 3 connection steps  

**Done when:** Claude write → Redis → live state change is proven.

---

## Phase 2 — Stop and test

```text
1. Inspector / smoke local ✓
2. Production health + state ✓
3. Claude connector adds signals ✓
4. GST Weak → Emerging on live /api/state ✓
```

**Do not start Phase 3 until the Claude → live Redis path works.**

---

# PHASE 3 — Premium UI (~75 min)

**Outcome:** Premium feel; §12 demo nail; README written; redeployed.

Architecture stays the same. This phase is components + motion + client sync.

---

## Task 3.0 — UI dependencies & primitives

**Depends on:** Phase 2

1. Ensure `motion`, `sonner`, shadcn/ui: Sheet, Dialog, Select, Tooltip, Popover.
2. Toaster in `app/layout.tsx`.
3. Shared UI atoms:
   - `StatusPill`, `PolarityPill`, `ViaClaudeBadge`, `SourceDots`, `LiveIndicator`
   - `MetricCard`, `ThemeCard`, `Sparkline` (80×24 SVG), `ActivityItem`
4. Map CSS variables into Tailwind theme (or use `var(--*)` classes).

---

## Task 3.1 — Client state hook

**File:** `lib/hooks/use-app-state.ts` (or `components/providers/app-state.tsx`)

### Behaviour
- SWR key `'/api/state'`, `refreshInterval: 3000`.
- Pause polling when `document.visibilityState === 'hidden'` (SWR `isVisible` / custom `refreshInterval` function / `useEffect` toggling).
- Track previous snapshot:
  - New activity with `via: 'claude'` → toast *"✦ Claude added N signals"*
  - `statusChange` entries → sonner with from→to pills + View action
- Optimistic helpers wrapping mutate for signal/theme CRUD; rollback + error toast on failure.
- Expose: `data`, `isLoading`, `error`, mutation functions, `lastSyncedAt`.

**Done when:** editing a signal updates UI immediately; forced API failure rolls back with toast.

---

## Task 3.2 — Dashboard `/`

**Files:** `app/page.tsx`, `components/dashboard/*`

### Build order (one composition at a time)
1. **Header:** SVG wordmark (rounded square + pulse line) · LiveIndicator · search input · New signal · Connect Claude (accent).
2. **Hero strip:** principle line + scoring popover (4 rules).
3. **Metrics row:** 4 cards; animate numbers with motion spring; Geist Mono tabular-nums.
4. **Theme board:** 4 columns; column header = StatusPill + animated count.
5. **ThemeCard:** name (2-line clamp), polarity, SourceDots+tooltips, `N signals · strength X.X`, velocity chip (↑ green / ↓ rose / → muted), sparkline stroke = status colour, top quote 1-line, via Claude if latest signal via claude. Click → `/themes/[id]`.
6. **layoutId** = `theme.id` on cards; spring `{ stiffness: 380, damping: 32 }` so column moves animate.
7. **Arrival glow:** when theme appears/status changes, apply accent box-shadow 2.5s (skip if `prefers-reduced-motion`).
8. **Activity rail:** last 12; Sparkles vs Pencil; relative time; status pills; new items animate from top.
9. **Footer:** Reset demo → confirm Dialog → `POST /api/reset`.
10. **Skeletons** on first load; empty states with copy + CTA.
11. **Search:** filter cards by theme name or any signal quote text.
12. **Keyboard:** `N` / `C` / `/` / `Esc` (ignore when typing in inputs except Esc).

**Done when:** reset demo shows GST in Weak with live pulsing indicator.

---

## Task 3.3 — Theme page `/themes/[id]`

**Files:** `app/themes/[id]/page.tsx`, related components

1. Load theme from SWR state by id; if missing after load → `not-found`.
2. Breadcrumb `Themes / {name}`.
3. Inline-editable name (click → input → Enter save / Esc cancel) via PATCH.
4. Optional description field.
5. Large status + polarity + chips (signals, sources, strength, velocity).
6. **Why {status}?** card from `reasons` (check vs grey) + `nextStatusHint`.
7. 8-week bar chart (SVG or Tailwind bars from `weeklyCounts`).
8. Signals list: quote with 2px polarity left border; summary; meta row (icon, label, detail, segment, date, via badge); hover Edit/Delete.
9. Actions menu (⋯): Rename · Merge (Dialog + theme picker → animate move / route to target) · Delete if empty.
10. Edit opens Signal sheet prefilled.

**Done when:** GST theme after Claude adds shows all-green Emerging reasons and via Claude badges.

---

## Task 3.4 — Signal sheet

**File:** `components/sheets/signal-sheet.tsx`

### Fields
Quote (textarea) · Summary · Theme (searchable Select + “Create new theme: '{typed}'”) · Source type (icons) · Source detail · Segment · Sentiment segmented control · Observed date.

### Behaviour
- Primary “Save signal”; shortcut ⌘/Ctrl+Enter.
- On success: close sheet, success toast, status-change toast if any.
- Validate client-side lightly; server remains source of truth.

---

## Task 3.5 — Connect Claude sheet

**File:** `components/sheets/connect-claude-sheet.tsx`

1. Title “Connect your Claude”.
2. MCP URL mono field + Copy → “Copied ✓”.
3. Numbered steps (Settings / Customize → Connectors → Add; paste URL name SignalOS; enable in chat).
4. Note: paid plan may be required.
5. 3 example prompts with copy buttons (exact text from problem statement).
6. Footer line: no AI inside SignalOS.

---

## Task 3.6 — App chrome polish

1. `app/error.tsx`, `app/not-found.tsx`.
2. Metadata: title “SignalOS”, description, Open Graph, favicon = logo SVG in `public/`.
3. Focus-visible rings use `--accent`.
4. Ensure poll updates don’t shift layout (fixed metric/column structure).
5. Responsive: stack columns under ~1024px (basic ok).
6. Respect `prefers-reduced-motion`.

---

## Task 3.7 — README + redeploy

**File:** `README.md`

Must include:
- Pitch line  
- Live URL · “No login needed”  
- MCP URL · 3 connection steps  
- Example prompts  
- “No AI inside” + `npm run check:no-ai`  
- Scoring rules (short)  
- Architecture in **3 bullets** (UI+MCP → store → Redis)  

Redeploy to Vercel. Run full §12 demo on production.

---

## Phase 3 — Stop and test (§12 demo script)

```text
1. Open live app → skeleton → board; GST Weak; live dot pulses
2. In Claude, paste GST call notes → list_themes → add_signals → reply Weak → Emerging + link
3. Within 3s: “✦ Claude added 2 signals” toast → GST card glides to Emerging + glow → counts tick → activity shows change
4. Open GST theme → Why Emerging? all green; new quotes via Claude
5. Edit a signal sentiment; rename theme → instant update + recalc
6. Ask Claude: “What are our emerging risks? Quote the evidence.” → get_trends
7. npm run check:no-ai on latest package.json
```

---

# PHASE 4 — Stretch (only if 1–3 + live demo are done)

---

## Task 4A — Hypotheses (lite) ~40 min

1. Extend types + zod + `StoreDocument.hypotheses`.
2. Scoring: `support% = Σ(w×recency supports) / Σ(all linked)`; verdict thresholds (≥70% & ≥3 links → Leaning true; ≤30% → Leaning false; else Inconclusive).
3. Store mutations: create/update hypothesis; link/unlink signal.
4. Seed one: “Automatic GST invoice capture is a reason SMBs would switch providers” + 1 supporting link.
5. UI panel under board; signal sheet link UI.
6. MCP: optional `hypothesisLinks` on `add_signals`; tool `list_hypotheses`.
7. Redeploy; smoke extended tools.

---

## Task 4B — Public share ~20 min

1. Store or derive slug per theme (create on Share click).
2. `app/share/[slug]/page.tsx`: read-only name, status, Why checklist, quotes with source+date.
3. Footer “Built with SignalOS”; `robots: noindex`.
4. Share button on theme page copies URL.

---

# Suggested file checklist (Phases 1–3)

```text
scripts/check-no-ai.mjs
scripts/smoke.mjs
lib/source-meta.ts
lib/schemas.ts
lib/scoring.ts
lib/scoring.test.ts
lib/seed.ts
lib/store.ts
lib/hooks/use-app-state.ts
app/globals.css
app/layout.tsx
app/page.tsx
app/error.tsx
app/not-found.tsx
app/themes/[id]/page.tsx
app/api/state/route.ts
app/api/health/route.ts
app/api/reset/route.ts
app/api/signals/route.ts
app/api/signals/[id]/route.ts
app/api/themes/route.ts
app/api/themes/[id]/route.ts
app/api/themes/merge/route.ts
app/api/[transport]/route.ts
components/dashboard/*
components/sheets/signal-sheet.tsx
components/sheets/connect-claude-sheet.tsx
components/ui/*                    # shadcn
public/favicon.svg
README.md
.env.local.example
```

---

# Risk register (watch while implementing)

| Risk | Mitigation |
|---|---|
| `mcp-handler` pulls `ai` | Use `@modelcontextprotocol/sdk` directly; `check:no-ai` in CI/pre-commit habit |
| CAS races during Claude + UI edit | Lua version check + 3 retries; never blind overwrite |
| Seed statuses drift with “today” | Relative dates; assert on every seed build |
| GST not Weak after seed | Exactly 2 sales_call, ≤10 days, no extra sources |
| Poll overwrites optimistic UI | SWR mutate with optimisticData + revalidate; match version if needed |
| Time overrun on UI | Ship Phase 2 first; Phase 3 cut empty-state copy / bar chart polish before cutting layoutId motion |
| Claude doesn’t call tools | Strengthen server instructions; example prompts in Connect sheet |

---

# Definition of done (assignment)

- [ ] Public Vercel URL, no login  
- [ ] MCP URL connected from Claude; create works  
- [ ] Human can edit in UI; live updates  
- [ ] No AI deps; `check:no-ai` passes  
- [ ] Scoring transparent in UI (“Why status?”)  
- [ ] §12 demo sequence works on production  
- [ ] README with link, MCP steps, no-AI section, 3-bullet architecture  
