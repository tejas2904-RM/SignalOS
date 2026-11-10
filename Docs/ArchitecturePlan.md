# SignalOS — Phase-Wise Architecture Plan

> Derived from `ProblemStatment.md`. Architecture stays deliberately simple: one store, one state endpoint, MCP + UI share the same mutations. Build in order; after each phase, stop and verify before continuing.

---

## 0. Principles (never compromise)

| # | Constraint | Architectural implication |
|---|---|---|
| 1 | Works from Claude via MCP | MCP tools and UI API routes both call `lib/store.ts` |
| 2 | A person can edit it | Same store → same Redis document → live UI via SWR poll |
| 3 | Live on the internet | Next.js on Vercel + Upstash Redis |
| 4 | No AI inside the app | Plain TypeScript scoring; `check:no-ai` guards `package.json` |
| 5 | Not a website builder / shop | Market-signal themes board only |
| 6 | No login | Single demo workspace; one Redis key |

**Product principle:** *Claude matches meaning. SignalOS does the maths. Zero AI inside.*

---

## 1. Target system shape

```
┌─────────────┐     Streamable HTTP      ┌──────────────────────────────┐
│   Claude    │ ───────────────────────► │  /api/[transport] (MCP)      │
│  (remote)   │ ◄─────────────────────── │  4 tools → lib/store.ts      │
└─────────────┘                          └──────────────┬───────────────┘
                                                        │
┌─────────────┐     REST (SWR 3s)        ┌──────────────▼───────────────┐
│  Browser UI │ ───────────────────────► │  /api/state · /api/signals   │
│  (Next.js)  │ ◄─────────────────────── │  /api/themes · /api/reset    │
└─────────────┘                          │  /api/health                 │
                                         └──────────────┬───────────────┘
                                                        │
                                         ┌──────────────▼───────────────┐
                                         │  lib/store.ts                │
                                         │  read → modify → CAS write   │
                                         │  + lib/scoring.ts (on read)  │
                                         │  + lib/schemas.ts (zod)      │
                                         │  + lib/seed.ts               │
                                         └──────────────┬───────────────┘
                                                        │
                                         ┌──────────────▼───────────────┐
                                         │  Upstash Redis               │
                                         │  key: signalos:data          │
                                         │  { themes, signals,          │
                                         │    activity, version }       │
                                         └──────────────────────────────┘
```

### Stack (fixed)

- **App:** Next.js (App Router) + TypeScript + Tailwind CSS
- **UI:** `motion`, `sonner`, `lucide-react`, shadcn/ui (Sheet, Dialog, Select, Tooltip, Popover), Geist Sans + Geist Mono
- **Storage:** `@upstash/redis` — single JSON document under `signalos:data`
- **MCP:** `@modelcontextprotocol/sdk` (or `mcp-handler` if it does not pull in `ai`) at `/api/mcp`
- **Client sync:** SWR poll `GET /api/state` every 3s (pause when tab hidden)
- **Deploy:** Vercel + Upstash from Vercel Storage

### Folder skeleton (end state)

```
app/
  layout.tsx, page.tsx, globals.css
  error.tsx, not-found.tsx
  themes/[id]/page.tsx
  share/[slug]/page.tsx          # Phase 4 stretch
  api/
    state/route.ts
    signals/route.ts
    themes/route.ts
    reset/route.ts
    health/route.ts
    [transport]/route.ts         # MCP
components/                      # dashboard, board, sheets, etc.
lib/
  store.ts                       # sole read/write surface
  scoring.ts                     # pure functions
  schemas.ts                     # zod (API + MCP)
  seed.ts
  source-meta.ts                 # weights, labels, icons, colours
public/favicon.svg
scripts/
  check-no-ai.mjs
  smoke.mjs
```

---

## Phase 1 — Foundation (~45 min)

**Goal:** Scoring + store + APIs work; a plain unstyled board proves data flow. No premium UI yet.

### 1.1 Project bootstrap

1. Scaffold Next.js (App Router, TypeScript, Tailwind).
2. Install: `@upstash/redis`, `zod`, `swr`, `geist`; add `motion`, `sonner`, `lucide-react`, shadcn primitives (can wait until Phase 3 if preferred, but tokens land now).
3. Wire Geist fonts in `app/layout.tsx`.
4. Define CSS variables in `globals.css` (tokens from §5) even if the board is unstyled — keeps Phase 3 fast.
5. Add `npm run check:no-ai` — fail if forbidden AI packages appear in `package.json` dependencies.

### 1.2 Domain + scoring (`lib/`)

| Module | Responsibility |
|---|---|
| `lib/schemas.ts` | Zod for Theme, Signal, Activity, mutation payloads; shared by API + MCP |
| `lib/source-meta.ts` | Source weights, labels, lucide icon keys, dot colours |
| `lib/scoring.ts` | Pure: strength, count, sources, velocity, polarity, weekly counts, status, `reasons`, `nextStatusHint` |
| `lib/seed.ts` | ~18 anonymised Indian-SMB spend-management signals; auto-seed when key empty; **assert target statuses** |
| `lib/store.ts` | Load/save Redis doc; all mutations; CAS via Lua `EVAL`; retry ≤ 3; reseed on missing/invalid |

**Scoring contract (computed on read, never stored):**

- `recency = 0.5 ^ (ageDays / 30)`
- `strength = Σ(weight × recency)` (1 decimal)
- Status order: Fading → Strong → Emerging → Weak
- GST demo seed must land **Weak** (exactly 2 `sales_call` signals, last 10 days)

**Unit tests:** status rules + Weak → Emerging transition detection.

### 1.3 Store contract

```
Document: signalos:data
{
  version: number,
  themes: Theme[],
  signals: Signal[],
  activity: Activity[]
}
```

- Every mutation: **read → modify → compare-and-set** (version must match).
- Integrity rules: unique theme names (case-insensitive); signal `themeId` must exist; cannot delete non-empty theme; merge moves signals then deletes source.
- Activity append on create/update/status change (cap display later; store can keep rolling window or full list).

### 1.4 HTTP API surface

| Route | Role |
|---|---|
| `GET /api/state` | Full computed view: themes+scoring, signals, activity, metrics, `version`. `Cache-Control: no-store` |
| `POST/PATCH/DELETE /api/signals` | CRUD signals via store |
| `POST/PATCH/DELETE /api/themes` | Create/rename/merge/delete themes |
| `POST /api/reset` | Reseed demo data |
| `GET /api/health` | `{ ok, signals, version }` |

Errors: `{ error: { code, message } }` + correct HTTP status.

### 1.5 Minimal UI (proof only)

- `/` fetches `/api/state` (SWR or fetch) and renders **four plain columns**: Strong / Emerging / Weak / Fading with theme names.
- Confirm GST is under Weak after seed.
- No layout animations, sheets, or polish.

### Phase 1 exit checklist

- [ ] `npm run check:no-ai` passes
- [ ] Scoring unit tests pass; seed status assertions pass
- [ ] `/api/state` returns themes with status, strength, reasons
- [ ] Mutations update Redis; concurrent CAS retries work
- [ ] `/api/health` ok
- [ ] Plain board shows GST in Weak
- [ ] **How to test:** start app → open `/` → hit `/api/state` → reset → confirm seed statuses

---

## Phase 2 — MCP + Deploy (~40 min)

**Goal:** Claude can create real data; live URL proves the assignment pass/fail bar.

### 2.1 MCP server

- Route: `app/api/[transport]/route.ts` → public URL `https://<app>.vercel.app/api/mcp`
- Transport: Streamable HTTP; **no auth**
- Prefer `@modelcontextprotocol/sdk` if `mcp-handler` pulls in `ai`

**Server instructions (tool-facing):** always `list_themes` first; split into verbatim quotes; reuse themes by meaning; batch via `add_signals`; quote evidence on Q&A; always return dashboard links.

| Tool | Mode | Behaviour |
|---|---|---|
| `list_themes` | read-only | id, name, status, polarity, count, sources, strength, velocity, url |
| `add_signals` | write | 1–20 items; exactly one of `themeId` / `newThemeName`; `via: 'claude'`; activity + statusChange; return created + transitions + URLs |
| `search_signals` | read-only | filters; ≤ 25; case-insensitive text match |
| `get_trends` | read-only | scored themes, reasons, top 3 quotes; optional status filter |

Validate with the **same** `lib/schemas.ts`. Helpful errors (“themeId not found. Call list_themes first.”).

### 2.2 Smoke + inspector

- Local: `npx @modelcontextprotocol/inspector` → `http://localhost:3000/api/mcp`
- `npm run smoke -- <baseUrl>` calls each tool once

### 2.3 Deploy path

1. Push to GitHub
2. Import on Vercel
3. Create Upstash Redis from Vercel → Storage; env: `KV_REST_API_URL`/`KV_REST_API_TOKEN` **or** `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`
4. Deploy; verify `/api/health` and `/api/state`
5. Add Claude custom connector pointing at `https://<app>.vercel.app/api/mcp`
6. Paste GST notes in Claude → expect Weak → Emerging on live dashboard

### Phase 2 exit checklist

- [ ] Inspector lists 4 tools; `list_themes` / `add_signals` work locally
- [ ] Live MCP URL documented
- [ ] Claude connector creates signals; GST flips Weak → Emerging on live page
- [ ] Smoke script green against production URL
- [ ] **Deliverable for reviewer:** exact MCP URL + connection steps

---

## Phase 3 — Premium UI (~75 min)

**Goal:** Linear/Vercel/Raycast-level feel; nail the §12 demo. Architecture unchanged — only presentation and client UX.

### 3.1 Design system application

- Dark default; tokens from §5; 8px grid; max width 1440px
- Status pills, polarity colours, source dots, “via Claude” (Sparkles) badge
- Radius: 12 cards / 8 controls / 999 pills; hairline borders; hover lift
- Escape all user/Claude text as plain text (no `dangerouslySetInnerHTML`)

### 3.2 Screens

**Dashboard `/`**

- Header: wordmark SVG · live indicator · search · “+ New signal” · “Connect Claude”
- Hero line + “How scoring works” popover
- Metric row (4): signals this week · emerging themes · avg sources/emerging · % via Claude — animated numbers
- Theme board: 4 columns; cards with polarity, source dots, strength, velocity chip, 8-week sparkline (inline SVG), top quote, via Claude badge; `layoutId` spring between columns
- Activity rail (last 12); Reset demo (confirm dialog)

**Theme `/themes/[id]`**

- Breadcrumb; inline-editable name; description
- Status / polarity / stat chips; “Why {status}?” checklist + `nextStatusHint`
- 8-week bar chart; signals list (quote + meta; hover Edit/Delete)
- Actions: Rename · Merge · Delete (empty only)
- 404 / `not-found` for unknown ids

**Sheets**

- Signal Add/Edit (⌘/Ctrl+Enter); theme searchable select with create-new
- Connect Claude: MCP URL + copy, 3 steps, 3 example prompts, no-AI note

### 3.3 Motion & live UX

| Behaviour | Spec |
|---|---|
| Column moves | shared `layoutId`, spring stiffness 380 / damping 32 |
| Arrival glow | accent ring fade 2.5s |
| Toasts | status-change + “Claude is writing” on new `via: 'claude'` activity |
| Live header | pulsing green · “synced Xs ago” |
| Skeletons / empty states | first load; short copy + action |
| Shortcuts | `N` signal · `C` connect · `/` search · `Esc` close |
| Optimistic SWR | mutate → rollback + error toast on failure |
| Reduced motion | disable springs/glow when preferred |

### 3.4 Client data layer

- One SWR key for `/api/state`; `refreshInterval: 3000`; pause when `document.hidden`
- Optimistic updates for signal/theme mutations
- Detect new Claude activity / status changes between poll snapshots for toasts

### 3.5 Polish + README

- `<title>`, favicon, Open Graph, focus-visible accent rings
- Desktop 1280–1920; stack columns on small screens (mobile polish not required)
- `error.tsx`, `not-found.tsx`
- README: pitch, live URL, no login, MCP URL, 3 steps, example prompts, no-AI + `check:no-ai`, scoring rules, architecture in 3 bullets
- Redeploy; run full §12 demo

### Phase 3 exit checklist (§12 demo)

1. Skeleton → board; GST in Weak; live dot pulsing
2. Claude GST notes → `list_themes` → `add_signals` → reply Weak → Emerging + link
3. ≤3s: Claude toast → GST card glides to Emerging + glow; counts tick; activity shows change
4. Theme page: Why Emerging all green; new quotes “via Claude”
5. Edit sentiment + rename; instant recalc
6. Claude: emerging risks → `get_trends` with quotes

---

## Phase 4 — Stretch (only after live §12 demo works)

Do **not** start until Phases 1–3 are green on the public URL.

### 4A. Hypotheses (lite) — preferred upgrade

- Type + score (`support%`, verdict thresholds) in store + scoring helpers
- UI panel under board; link/unlink from signal sheet
- MCP: optional `hypothesisLinks` on `add_signals`; new `list_hypotheses`
- Seed one GST-related open hypothesis with 1 supporting link

### 4B. Public share page

- “Share” on theme → `/share/[slug]` read-only evidence page
- `noindex`; “Built with SignalOS” footer

---

## Cross-cutting robustness (land with Phases 1–2; verify in 3)

| Concern | Approach |
|---|---|
| Concurrent edits | Versioned CAS Lua write, retry ≤ 3 |
| Validation | Single zod schemas for API + MCP |
| Integrity | Block bad deletes; merge moves then delete; unique names |
| Self-heal | Missing/invalid Redis → reseed + warn |
| XSS | Text-only rendering |
| Polling | 3s SWR; pause when hidden; `no-store` |
| Tests | Scoring unit tests; Weak→Emerging; `smoke` against URL |
| Health | `GET /api/health` |

---

## Build order summary

| Phase | Focus | Secures |
|---|---|---|
| **1** | Scoring, store, APIs, plain board | Correct maths + data model |
| **2** | MCP + Vercel + Upstash + Claude | Assignment pass/fail (Claude → live app) |
| **3** | Premium UI, motion, sheets, README | Demo quality / reviewer experience |
| **4** | Hypotheses / share | Optional polish after demo works |

**Rule:** MCP early. Do not polish the UI before Claude can write to production Redis and the live board updates.
