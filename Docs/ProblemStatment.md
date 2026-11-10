# SignalOS: Build Spec (premium feel, simple architecture, 2–3 hours)

> Read the whole file before coding. Build in the phases in §11. After each phase, stop and tell me how to test it.
> **Goal:** it must *look and feel* like a premium product (think Linear, Vercel or Raycast), while the architecture stays very simple. Polish over features. Don't add anything not in this file.

---

## 0. Hard constraints from the assignment (never break these)
1. **Works from Claude:** a request typed in Claude creates something real in the app through **MCP**.
2. **A person can edit it:** a reviewer opens the app, sees what Claude created and changes it.
3. **Live on the internet:** deployed on Vercel at a public URL.
4. **No AI inside the app:** no OpenAI, Anthropic, Gemini, Vercel AI SDK (`ai`), LangChain, LlamaIndex, embeddings, vector DBs, or any AI API key. All logic is plain TypeScript.
5. Not a website builder or an online shop.
6. **Submission needs:** the live app link (no login, so no test credentials needed), the MCP link, and simple steps to connect it to Claude.

Add an npm script, `check:no-ai`, that fails if **package.json dependencies** include any of: `openai`, `@anthropic-ai/sdk`, `anthropic`, `@google/generative-ai`, `cohere-ai`, `ai`, `langchain`, `@langchain/*`, `llamaindex`, `@pinecone-database/pinecone`. If `mcp-handler` pulls in the `ai` package, drop it and use `@modelcontextprotocol/sdk` directly.

---

## 1. Product
**SignalOS turns conversations into market intelligence.** Founder's Office and product teams save market signals (customer calls, sales calls, churn reasons, Reddit, competitor moves, news) from their own Claude. SignalOS groups them into **themes**, scores each theme with a transparent formula, and shows what's **Strong / Emerging / Weak / Fading**.

**Principle (show it in the UI and README):** *Claude matches meaning. SignalOS does the maths. Zero AI inside.*

---

## 2. Architecture (deliberately simple)
- **Next.js (App Router) + TypeScript + Tailwind CSS**, deployed on **Vercel**.
- **UI libraries (none of them AI):** `motion` (Framer Motion) for animation, `sonner` for toasts, `lucide-react` for icons, shadcn/ui for Sheet, Dialog, Select, Tooltip and Popover. Font: **Geist Sans + Geist Mono** (the `geist` package or `next/font`).
- **Storage: Upstash Redis** (created from Vercel → Storage). Use `@upstash/redis` and read `KV_REST_API_URL`/`KV_REST_API_TOKEN` **or** `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`.
  - **Everything lives in one JSON document** under the key `signalos:data` (`{ themes, signals, activity }`). Each write: read → modify → write. No ORM, no SQL, no migrations.
- **No login.** One demo workspace.
- **One store module, `lib/store.ts`**, holds all reads and mutations. The UI's API routes and the MCP tools both call it. No duplicated logic.
- **One read endpoint, `GET /api/state`**, returns the full computed view (themes with scoring, signals, activity, metrics, `version`). The client polls it with **SWR every 3 seconds**.
- **Mutations:** `POST/PATCH/DELETE` route handlers under `/api/signals`, `/api/themes`, `/api/reset`, using **optimistic updates** in SWR, rolled back with an error toast on failure.
- **MCP:** `mcp-handler` (Vercel) or `@modelcontextprotocol/sdk` with Streamable HTTP, at `app/api/[transport]/route.ts`, so the MCP URL is `https://<app>.vercel.app/api/mcp`. No auth.

---

## 3. Data types
```ts
type SourceType = 'customer_call' | 'sales_call' | 'churn_feedback' | 'support_ticket'
                | 'competitor' | 'community' | 'news' | 'other'
type Sentiment = 'risk' | 'opportunity' | 'neutral'
type Theme    = { id: string; name: string; description?: string; createdAt: string; createdVia: 'claude' | 'web' }
type Signal   = { id: string; themeId: string; quote: string; summary: string; sourceType: SourceType;
                  sourceDetail?: string; segment?: string; sentiment: Sentiment;
                  observedAt: string; via: 'claude' | 'web'; createdAt: string; updatedAt: string }
type Activity = { id: string; text: string; via: 'claude' | 'web'; at: string;
                  themeId?: string; statusChange?: { from: Status; to: Status } }
```
**Source weights:** customer_call 1.0 · sales_call 1.0 · churn_feedback 1.0 · support_ticket 0.8 · competitor 0.6 · community 0.5 · news 0.3 · other 0.4.
Each source type also has a **label, a lucide icon and a dot colour** (used everywhere).

---

## 4. Scoring (`lib/scoring.ts`, pure functions, computed on read)
- `ageDays = today − observedAt`; `recency = 0.5 ^ (ageDays / 30)`
- **Strength** = Σ weight × recency (1 decimal) · **count** · **sources** = distinct source types
- `last14` = age ≤ 14 days; `prev14` = age 15–28 days; **velocity** = last14 − prev14
- **Polarity** = the majority sentiment → Risk / Opportunity / Neutral
- **Weekly counts** for the last 8 weeks (for sparklines)

**Status, in this order:**
1. **Fading:** no signal in the last 30 days
2. **Strong:** count ≥ 8 AND sources ≥ 3
3. **Emerging:** count ≥ 3 AND sources ≥ 2 AND last14 ≥ 1 AND last14 ≥ prev14
4. **Weak:** everything else

Also return a **`reasons`** array per theme for the "Why this status?" checklist, e.g.
`[{label:'3+ signals', met:true, value:'4'}, {label:'2+ source types', met:true, value:'2'}, {label:'Rising (last 14d ≥ prior 14d)', met:true, value:'4 vs 0'}]`, and **`nextStatusHint`**, e.g. *"1 more signal from a new source type → Emerging"*.

---

## 5. Visual design system (this is what makes it look premium)
**Mode:** dark by default (it looks best on video). Calm, precise, information-dense. No gradients-everywhere, no emoji in the UI chrome. Use icons instead.

**Colour tokens (CSS variables in `globals.css`):**
| Token | Value | Use |
|---|---|---|
| `--bg` | `#0A0A0B` | page |
| `--surface` | `#111113` | cards, panels |
| `--surface-2` | `#18181B` | hover, inputs |
| `--border` | `rgba(255,255,255,0.07)` | 1px hairlines |
| `--text` | `#EDEDEF` | primary text |
| `--muted` | `#8A8F98` | secondary text |
| `--accent` | `#7C6CF2` | primary buttons, focus rings, links |
| Strong | `#10B981` | status |
| Emerging | `#F59E0B` | status |
| Weak | `#71717A` | status |
| Fading | `#64748B` | status |
| Risk | `#F43F5E` | polarity |
| Opportunity | `#10B981` | polarity |

**Typography:** Geist Sans. Page title 20px/600; section labels 11px uppercase with letter-spacing 0.06em in `--muted`; body 14px; numbers in **Geist Mono, tabular-nums**. Quotes are 15px with a 2px left border in the polarity colour.

**Shape and depth:** radius 12px (cards), 8px (inputs and buttons), 999px (pills). 1px hairline borders, no heavy shadows. On hover a card lifts slightly (`translateY(-1px)`, border brightens to `rgba(255,255,255,0.12)`).

**Status pills:** a small dot plus a label, tinted background (status colour at 12% opacity) and text in the status colour. Same component everywhere.

**"via Claude" badge:** a neutral pill with a lucide `Sparkles` icon and the text "via Claude". **Do not use Claude or Anthropic logos.**

**Spacing:** an 8px grid; generous padding (cards 16px, page 32px). Max content width 1440px.

---

## 6. Motion and interaction (Framer Motion; keep it subtle, 150–250ms)
1. **Cards move between columns with a shared `layoutId` and a spring** (stiffness 380, damping 32). When the GST theme flips Weak → Emerging, the card **physically glides** into the Emerging column. This is the demo's hero moment.
2. **Glow on arrival:** a newly added or changed theme card or signal gets an accent ring (`box-shadow 0 0 0 1px var(--accent), 0 0 24px rgba(124,108,242,0.35)`) that fades over 2.5 seconds.
3. **Status-change toast** (sonner): *"GST input credit lost on missing invoices"* with a `Weak → Emerging` pill pair and a "View" action that opens the theme.
4. **"Claude is writing" toast:** when polling finds new `via: 'claude'` activity, show *"✦ Claude added 2 signals"*.
5. **Animated numbers:** metric cards and column counts tick to new values (spring number animation).
6. **Live indicator** in the header: a pulsing green dot plus *"Live · synced 2s ago"* (updates every second).
7. **Skeletons** on first load (no spinners). **Empty states** with a short line of copy and an action.
8. **Sheets slide in from the right** for Add/Edit signal and Connect Claude; Esc closes them.
9. **Keyboard shortcuts:** `N` new signal · `C` connect Claude · `/` focus search · `Esc` close. Show them in tooltips.
10. **Optimistic edits:** the UI updates instantly; rollback plus an error toast if the request fails.
11. Respect `prefers-reduced-motion` (turn off springs and glow).

---

## 7. Screens

### 7.1 Dashboard `/`
**Header bar:** the SignalOS wordmark (a simple custom logo: a small rounded square with a pulse line, in SVG) · live indicator · search input (filters theme cards by name or quote text) · **"+ New signal"** button · **"Connect Claude"** button (accent).

**Hero strip:** one line in `--muted`: *"Claude matches meaning. SignalOS does the maths."*, plus a **"How scoring works"** popover with the 4 rules.

**Metric row (4 cards, numbers in Geist Mono):** Signals this week · Emerging themes · Avg sources per emerging theme · Signals added via Claude (%).

**Theme board:** 4 columns, **Strong · Emerging · Weak · Fading**. Each column header shows a status pill and an animated count. **Theme card:**
- Name (2 lines max) and a polarity pill (Risk/Opportunity)
- A row of **source dots** (one coloured dot per distinct source type, with a tooltip naming it)
- `N signals · strength 4.2` (mono) and a velocity chip (`↑ 3` green, `↓ 1` rose, `→` muted)
- An **8-week sparkline** (hand-rolled inline SVG, 80×24, stroke in the status colour)
- The top quote truncated to 1 line in `--muted`
- A "via Claude" badge if the most recent signal came from Claude
Click to open the theme page.

**Right rail, "Activity"** (last 12): an icon (Sparkles for Claude, Pencil for web), the text and a relative time; status-change entries show the from → to pills. New entries slide in from the top.

**Footer:** a small "Reset demo data" text button (with a confirm dialog).

### 7.2 Theme page `/themes/[id]`
- Breadcrumb "Themes / {name}". **Inline-editable name** (click to edit, Enter to save) and an optional description.
- A large status pill, polarity pill, and stat chips: signals, sources, strength, velocity.
- A **"Why {status}?" card:** a checklist from `reasons` (green check or grey circle with the value), plus `nextStatusHint` in `--muted`. This makes the scoring tangible.
- **8-week bar chart** (hand-rolled SVG or a simple Tailwind bar row).
- **Signals list:** each item shows the **quote** (prominent, polarity left border), summary, a meta row (source icon and label · detail · segment · date · "via Claude" badge). Hover reveals **Edit** and **Delete** icon buttons. Edit opens the Signal sheet.
- Actions menu (⋯): **Rename · Merge into another theme…** (a dialog with a theme picker; on confirm, signals move with an animation and you're routed to the target theme) · **Delete theme** (only if empty).

### 7.3 Signal sheet (Add / Edit)
Fields: Quote (textarea) · Summary · Theme (searchable select with **"Create new theme: '{typed}'"**) · Source type (select with icons) · Source detail · Segment · Sentiment (3-way segmented control: Risk / Neutral / Opportunity) · Observed date. Primary button "Save signal" (⌘/Ctrl+Enter). After saving: close the sheet, show a toast, and show the status-change toast if any.

### 7.4 Connect Claude sheet (important for reviewers)
- Title: "Connect your Claude".
- The **MCP URL** in a mono field with a **Copy** button (shows "Copied ✓").
- 3 numbered steps:
  1. In Claude, open **Settings / Customize → Connectors → Add custom connector**.
  2. Paste the URL, name it **SignalOS**, and add it.
  3. In a chat, click **+ → Connectors** and switch on **SignalOS**.
- A note in `--muted`: "Custom connectors may require a paid Claude plan."
- **3 example prompts**, each with a copy button:
  - *"I spoke to two finance managers at small manufacturing firms. Both lose GST input credit every month because vendor invoices go missing. Save these as signals."*
  - *"What are our emerging risks right now? Quote the evidence."*
  - *"Search our signals about reimbursements and summarise what customers are saying."*
- A line: "No AI runs inside SignalOS. Your own Claude does the thinking."

### 7.5 Polish checklist
Page `<title>` and favicon (the SVG logo) · Open Graph meta · focus-visible rings in the accent colour · no layout shift on poll updates · works at 1280–1920px (stack the columns on mobile; mobile polish is not required) · 404 page for unknown themes.

---

## 8. MCP server (4 tools, all calling `lib/store.ts`)
**Server instructions:**
> SignalOS stores market signals for a startup team. When the user shares notes or observations: ALWAYS call `list_themes` first; split the input into separate signals, each with a verbatim quote; reuse an existing theme when the meaning matches (even if worded differently) and create a new theme only if nothing fits; then call `add_signals` once with all of them. When answering questions, use `get_trends` / `search_signals` and quote stored evidence. Always share the dashboard link from the tool result.

1. **`list_themes`** `{}` → id, name, status, polarity, count, sources, strength, velocity, url.
2. **`add_signals`** `{ signals: [{ quote, summary, themeId?, newThemeName?, sourceType, sourceDetail?, segment?, sentiment, observedAt? }] }`. 1–20 items; exactly one of `themeId`/`newThemeName`; reuse a theme if the name matches (case-insensitive). Sets `via: 'claude'`, writes activity (including `statusChange` entries). **Returns the created signals plus status changes** (compare before and after), e.g. *"GST input credit lost on missing invoices: Weak → Emerging"*, plus the dashboard and theme URLs.
3. **`search_signals`** `{ query?, themeId?, sourceType?, sentiment? }` → up to 25 matches (case-insensitive text match on quote, summary, detail and segment).
4. **`get_trends`** `{ status? }` → themes with full scoring, `reasons` and the top 3 quotes.

Validate with `zod`. Error messages must be helpful (e.g. "themeId not found. Call list_themes first."). Mark `list_themes`, `search_signals` and `get_trends` as read-only (`readOnlyHint`) if supported.

---

## 9. Seed data (`lib/seed.ts`, about 18 signals, illustrative and anonymised)
Story: *spend management for Indian SMBs.* Dates relative to today. About half `via: 'claude'`. No real company or person names (use e.g. "Finance lead, 40-person D2C brand, Pune").

| Theme | Target status | Polarity |
|---|---|---|
| Manual reimbursements take too long | **Strong:** 8 signals, 3+ source types, recent | Opportunity |
| Exporters want multi-currency cards | **Emerging:** 3 signals, 2 types, last 14 days | Opportunity |
| Accounting-software sync keeps breaking | **Emerging:** 3 signals, 2 types | Risk |
| **GST input credit lost on missing invoices** | **Weak: exactly 2 signals, both `sales_call`, within the last 10 days** | Opportunity |
| Interest in UPI corporate payments | **Fading:** 2 signals, 40+ days old | Opportunity |

The GST theme is the **demo theme**: adding 2 `customer_call` signals must flip it **Weak → Emerging**. Seed automatically when the key is empty; "Reset demo data" reseeds. Verify the target statuses with the scoring functions (throw if wrong).

---

## 10. README
Pitch line · live URL · "No login needed" · MCP URL · the 3 connection steps · example prompts · a "No AI inside" section (`npm run check:no-ai`) · scoring rules · the architecture in 3 bullets.

---

## 11. Build phases (MCP early, so the pass/fail requirement is secured first)
**Phase 1, foundation (~45 min):** Next.js + Tailwind + Geist + shadcn + design tokens; `lib/scoring.ts` (+ unit tests), `lib/store.ts`, `lib/seed.ts`; `/api/state` + mutation routes; `check:no-ai`; a **plain, unstyled dashboard** showing the 4 columns from `/api/state`.
**Phase 2, MCP + deploy (~40 min):** the 4 MCP tools (§8); test with `npx @modelcontextprotocol/inspector` at `http://localhost:3000/api/mcp`; push to GitHub → Vercel → connect Upstash → deploy → add the connector in Claude → confirm that pasting the GST notes in Claude moves the card to Emerging on the live page. **Give me the exact MCP URL and the test steps.**
**Phase 3, premium UI (~75 min):** dashboard (header, metrics, 4-column board with layout animations, sparklines, activity rail), theme page ("Why" card, chart, signal list), signal sheet, connect sheet, toasts, glow, live indicator, skeletons, shortcuts, optimistic updates. Redeploy, run the §12 demo, write the README.
**Phase 4, stretch (only if Phases 1–3 are done and the demo works):** §14.

---

## 12. Demo the build must nail
1. The dashboard loads (skeleton → board). GST sits in **Weak**. The live dot is pulsing.
2. In Claude, paste the GST call notes → Claude calls `list_themes`, then `add_signals` → the reply reports **Weak → Emerging** with a link.
3. Within 3 seconds: the toast "✦ Claude added 2 signals", then the **GST card glides into Emerging** with a glow, the counts tick and the activity rail shows the status change.
4. Open the GST theme → the "Why Emerging?" checklist is all green; the new quotes have "via Claude" badges.
5. Edit a signal (change its sentiment) and rename the theme; the update is instant and everything recalculates.
6. Ask Claude *"What are our emerging risks? Quote the evidence."* → `get_trends`.

---

## 13. Robustness requirements (cheap, but required)
1. **Safe writes:** store a `version` number in the JSON document. Every mutation in `lib/store.ts` does read → modify → **compare-and-set** (an Upstash `EVAL` Lua script that writes only if the version is unchanged), retrying up to 3 times. Claude and a person editing at the same moment must never overwrite each other.
2. **Validation everywhere:** one set of `zod` schemas in `lib/schemas.ts`, used by the API routes **and** the MCP tools. Limits: quote 3–1000 chars, summary ≤ 160, theme name 2–80, 1–20 signals per batch, valid enums and dates (no future dates).
3. **Data integrity:** deleting a theme with signals is blocked; merging moves every signal then deletes the source; a signal's `themeId` must exist; theme names are unique (case-insensitive, trimmed).
4. **Helpful errors:** API routes return `{ error: { code, message } }` with correct HTTP codes. MCP tools return readable errors that tell Claude what to do next (e.g. "themeId not found. Call list_themes first."). The UI shows error toasts and never a blank screen. Add `error.tsx` and `not-found.tsx`.
5. **Self-healing data:** if the Redis key is missing or fails validation, reseed automatically and log a warning.
6. **Escaping:** render all user and Claude text as plain text (no `dangerouslySetInnerHTML`).
7. **Polling hygiene:** SWR polling every 3 seconds pauses when the tab is hidden; `/api/state` sends `Cache-Control: no-store`.
8. **Tests:** unit tests for the scoring status rules and the Weak → Emerging detection in `add_signals`; a smoke script, `npm run smoke`, that calls each MCP tool once against a URL passed as an argument.
9. **Health check:** `GET /api/health` returns `{ ok: true, signals: n, version }`, for checking the live deployment quickly.

---

## 14. Stretch features (only after the §12 demo works on the live URL)
**A. Hypotheses (lite), the best upgrade (~40 min):**
- Type: `Hypothesis = { id, statement, status: 'open'|'validated'|'invalidated', links: { signalId, stance: 'supports'|'contradicts' }[] }`.
- Score: `support% = Σ(weight×recency of supports) / Σ(all linked)`. Verdict: "Leaning true" if ≥ 70% with 3+ links, "Leaning false" if ≤ 30%, otherwise "Inconclusive".
- UI: a "Hypotheses" panel under the board (statement, support/contradict bar, verdict). Edit the statement and status; link and unlink signals from the signal sheet.
- MCP: `add_signals` accepts an optional `hypothesisLinks: [{ hypothesisId, stance }]` per signal, plus a new tool `list_hypotheses`.
- Seed one hypothesis: "Automatic GST invoice capture is a reason SMBs would switch providers" (1 supporting link).

**B. Public share page (~20 min):** a "Share" button on the theme page creates `/share/[slug]`: a read-only, logged-out evidence page (name, status, "Why" checklist, quotes with source and date) with a "Built with SignalOS" footer and `noindex`.