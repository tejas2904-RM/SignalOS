# SignalOS — Test Plan

> Concrete tests to run during and after build.  
> Maps to `EdgeCases.md` IDs and `ImplementationPlan.md` phases.  
> Evals / acceptance bars live in `Evals.md`.

---

## Test pyramid

| Layer | What | Tooling | When |
|---|---|---|---|
| **Unit** | Scoring, status, seed assertions, zod schemas | Vitest (`npm test`) | Phase 1+; every change to `lib/scoring.ts` / `seed.ts` / `schemas.ts` |
| **Integration** | Store CAS, API routes, self-heal | Vitest + Redis (or route handlers with real Upstash) | Phase 1 end |
| **MCP smoke** | All 4 tools once against a URL | `npm run smoke -- <url>` | Phase 2+ |
| **Manual / demo** | UI + Claude live path | Browser + Claude connector | Phase 2–3 |
| **Guard** | No AI packages | `npm run check:no-ai` | Always |

---

## 0. Always-on guards

### T-GUARD-01 — `check:no-ai`
```bash
npm run check:no-ai
```
**Pass:** exit 0.  
**Fail:** any forbidden dependency name in `package.json` `dependencies`.

### T-GUARD-02 — Typecheck / build
```bash
npx tsc --noEmit
npm run build
```
**Pass:** clean compile; Next.js build succeeds with env present.

---

## 1. Unit tests — scoring (`lib/scoring.test.ts`)

| Test ID | Name | Setup | Assert | Edge refs |
|---|---|---|---|---|
| T-SC-01 | fading_when_no_recent | All signals age > 30d | status `fading` | SC-12 |
| T-SC-02 | strong_requires_8_and_3_sources | 8 signals, 3 types, recent | `strong` | SC-07/08 |
| T-SC-03 | not_strong_if_only_2_sources | 8 signals, 2 types | not `strong` | SC-07 |
| T-SC-04 | emerging_happy_path | count≥3, sources≥2, last14≥1, last14≥prev14 | `emerging` | SC-09 |
| T-SC-05 | not_emerging_if_velocity_down | last14 < prev14 | not `emerging` | SC-10 |
| T-SC-06 | not_emerging_if_last14_zero | last14 = 0 | not `emerging` | SC-11 |
| T-SC-07 | weak_catchall | 2 signals, 1 source, recent | `weak` | SC-18 |
| T-SC-08 | fading_beats_strong | Old but count≥8 sources≥3 | `fading` | SC-12 |
| T-SC-09 | polarity_majority | 3 risk, 1 opp | Risk | SC-14 |
| T-SC-10 | polarity_tie_neutral | 2 risk, 2 opp | Neutral | SC-13 |
| T-SC-11 | strength_one_decimal | Controlled weights/dates | e.g. `x.x` | SC-15 |
| T-SC-12 | last14_boundary_day_14 | ageDays = 14 | in last14 | SC-03 |
| T-SC-13 | prev14_boundary_day_15 | ageDays = 15 | in prev14 | SC-04 |
| T-SC-14 | weekly_counts_length_8 | Any theme | `weeklyCounts.length === 8` | SC-16/17 |
| T-SC-15 | gst_weak_then_emerging | 2 sales_call → +2 customer_call | Weak then Emerging; `detectStatusChanges` fires | SC-18/19 |
| T-SC-16 | reasons_and_hint_present | Weak GST | `reasons[]` non-empty; `nextStatusHint` string | SC-18 |
| T-SC-17 | velocity_math | last14=4, prev14=1 | velocity `3` | — |

**Command:** `npm test`

---

## 2. Unit tests — schemas (`lib/schemas.test.ts`)

| Test ID | Case | Expect | Edge refs |
|---|---|---|---|
| T-VAL-01 | quote length 2 | fail | VAL-01 |
| T-VAL-02 | quote length 3 and 1000 | pass | VAL-02/03 |
| T-VAL-03 | quote 1001 | fail | VAL-04 |
| T-VAL-04 | summary 161 | fail | VAL-05 |
| T-VAL-05 | theme name 1 / 81 | fail | VAL-07/09 |
| T-VAL-06 | theme name trim | stores trimmed concept | VAL-10 |
| T-VAL-07 | future observedAt | fail | VAL-16/17, future |
| T-VAL-08 | both themeId + newThemeName | fail | VAL-14 |
| T-VAL-09 | neither theme id nor name | fail | VAL-15 |
| T-VAL-10 | batch size 0 and 21 | fail | VAL-12/13 |
| T-VAL-11 | batch size 1 and 20 | pass | — |
| T-VAL-12 | invalid enums | fail | VAL-16 |

---

## 3. Unit / integration — seed (`lib/seed.test.ts`)

| Test ID | Assert |
|---|---|
| T-SEED-01 | `buildSeedData()` → ~18 signals, 5 themes |
| T-SEED-02 | `assertSeedStatuses()` does not throw for “today” |
| T-SEED-03 | GST theme → Weak |
| T-SEED-04 | Reimbursements → Strong |
| T-SEED-05 | Multi-currency + accounting sync → Emerging |
| T-SEED-06 | UPI → Fading |
| T-SEED-07 | ~50% `via: 'claude'` (tolerance ±2 signals) |
| T-SEED-08 | No obvious real company names in quotes (smoke string denylist optional) |

Simulate `now = fixed Date` and `now = fixed + 7 days` to ensure relative dating still asserts (SEED-01).

---

## 4. Store integration tests

> Requires Upstash credentials in env (use a **dev** Redis key or prefix if possible).

| Test ID | Steps | Pass criteria | Edge refs |
|---|---|---|---|
| T-ST-01 | Delete key → `getComputedState()` | Auto-seed; 5 themes | ST-01 |
| T-ST-02 | Write garbage JSON → read | Reseed + warn | ST-02 |
| T-ST-03 | `createSignal` on GST twice as customer_call | Status Emerging; activity has statusChange | SC-19 |
| T-ST-04 | `deleteTheme` with signals | Throws / rejects | ST-03 |
| T-ST-05 | Delete all signals then theme | Theme gone | ST-04 |
| T-ST-06 | `mergeThemes(A,B)` | Signals on B; A gone | ST-05 |
| T-ST-07 | Create theme `"GST"` when exists | Conflict | VAL-11 |
| T-ST-08 | Parallel `Promise.all` two mutations | Both applied or clean retry; final version coherent; no lost write | ST-09 |
| T-ST-09 | `resetDemo()` | Back to seed statuses | SEED-02 |
| T-ST-10 | `searchSignals({ query: 'GST' })` | Matches quotes/summaries | — |

---

## 5. API route tests (HTTP)

Base: `http://localhost:3000` (dev) or staging URL.

| Test ID | Request | Pass |
|---|---|---|
| T-API-01 | `GET /api/health` | 200 `{ ok: true, signals, version }` |
| T-API-02 | `GET /api/state` | 200; themes scored; header `Cache-Control: no-store` |
| T-API-03 | `POST /api/reset` | 200; GST Weak in subsequent state |
| T-API-04 | `POST /api/signals` valid body | 200/201; signal in state |
| T-API-05 | `POST /api/signals` quote too short | 400 `{ error: { code, message } }` |
| T-API-06 | `PATCH /api/signals/:id` sentiment | Updated; polarity may change |
| T-API-07 | `DELETE /api/signals/:bad` | 404 |
| T-API-08 | `POST /api/themes` duplicate name | 409 |
| T-API-09 | `POST /api/themes/merge` | Signals moved |
| T-API-10 | `DELETE /api/themes/:id` with signals | 409 |

### Quick curl pack
```bash
curl -s $BASE/api/health
curl -s -X POST $BASE/api/reset
curl -s $BASE/api/state | jq '.themes[] | {name,status}'
```

---

## 6. MCP tests

### T-MCP-INSPECTOR (manual)
1. `npm run dev`
2. `npx @modelcontextprotocol/inspector` → `http://localhost:3000/api/mcp`
3. Tools listed: `list_themes`, `add_signals`, `search_signals`, `get_trends`

| Test ID | Tool call | Pass |
|---|---|---|
| T-MCP-01 | `list_themes` | GST present, status weak (after reset) |
| T-MCP-02 | `add_signals` 2× customer_call on GST | Returns Weak → Emerging; URLs present |
| T-MCP-03 | `list_themes` again | GST emerging |
| T-MCP-04 | `search_signals` `{ query: "invoice" }` | ≤25 hits; relevant |
| T-MCP-05 | `get_trends` `{ status: "emerging" }` | reasons + top quotes |
| T-MCP-06 | `add_signals` bad themeId | Helpful error mentioning `list_themes` |
| T-MCP-07 | `add_signals` newThemeName matching existing case-insensitive | Reuses theme | MCP-02 |
| T-MCP-08 | `npm run smoke -- $BASE` | Exit 0 |

### T-MCP-CLAUDE (manual / production)
1. Reset demo on live app  
2. Connect connector to `https://<app>.vercel.app/api/mcp`  
3. Prompt: GST finance managers notes (problem statement example)  
4. Confirm tool use + Emerging transition on live dashboard within ~3s (with SWR)

---

## 7. UI / E2E manual checklist

| Test ID | Steps | Pass |
|---|---|---|
| T-UI-01 | Load `/` | Skeleton → board; live dot pulses |
| T-UI-02 | After reset | GST in Weak column |
| T-UI-03 | Search theme name | Filters cards |
| T-UI-04 | Search quote fragment | Filters cards |
| T-UI-05 | Open theme | Why card + signals |
| T-UI-06 | Inline rename | Saves; board updates |
| T-UI-07 | Edit signal sentiment | Instant update; toast ok |
| T-UI-08 | Force API fail (offline) on edit | Rollback + error toast |
| T-UI-09 | `N` shortcut | Opens signal sheet |
| T-UI-10 | Type in textarea + `N` | Does not steal focus / open duplicate | UI-07 |
| T-UI-11 | `C` / `/` / `Esc` | Connect / search / close |
| T-UI-12 | Connect sheet | Copy MCP URL → Copied ✓ |
| T-UI-13 | Reset confirm cancel | No reset |
| T-UI-14 | Unknown theme URL | not-found |
| T-UI-15 | Hide tab 10s, return | Poll resumes; synced text updates |
| T-UI-16 | Reduced motion OS setting | No glide/glow |
| T-UI-17 | Claude add on live | Toast + card glides Weak→Emerging + glow + activity |

---

## 8. Phase gate tests (stop criteria)

### After Phase 1
```text
[ ] npm run check:no-ai
[ ] npm test   # scoring + schemas + seed
[ ] GET /api/health
[ ] POST /api/reset && GET /api/state → GST weak
[ ] Plain / board shows GST in Weak
```

### After Phase 2
```text
[ ] Inspector: 4 tools work
[ ] npm run smoke -- http://localhost:3000
[ ] Production health + smoke
[ ] Claude connector: GST Weak → Emerging on live state
```

### After Phase 3
```text
[ ] Full §12 demo (see Evals.md E-DEMO-*)
[ ] README links accurate
[ ] check:no-ai on deployed package.json
```

---

## 9. Regression matrix (quick)

Run after any scoring, store, or MCP change:

| # | Action |
|---|---|
| 1 | `npm test` |
| 2 | `npm run check:no-ai` |
| 3 | `POST /api/reset` |
| 4 | GST unit path Weak→Emerging |
| 5 | `npm run smoke -- <url>` |

---

## 10. Test data fixtures (suggested)

```ts
// fixtures/gst-weak.ts — 2 sales_call signals, observedAt = now - 5d
// fixtures/gst-emerging-delta.ts — 2 customer_call to append
// fixtures/fading-old.ts — signals observedAt = now - 45d
// fixtures/strong-theme.ts — 8 signals, 3+ source types, recent
```

Keep dates relative to injected `now` so tests are deterministic.
