# SignalOS — Edge Cases

> Boundary and failure scenarios the system must handle safely.  
> Pair with `Tests.md` (how to verify) and `Evals.md` (pass/fail quality bars).  
> Source of truth: `ProblemStatment.md`.

---

## 1. Scoring & status boundaries

| ID | Edge case | Expected behaviour |
|---|---|---|
| SC-01 | Theme with **0 signals** | Not present after delete-all, or if reachable: treat as Fading / empty; UI empty state; delete theme allowed |
| SC-02 | Signal observedAt **exactly 30 days** ago | Counts as outside “last 30 days” for Fading if using `ageDays ≤ 30` — **define:** Fading when **no** signal with `ageDays ≤ 30`. At exactly 30.0 days: still within window if `≤`; document and stick to one inequality |
| SC-03 | Signal observedAt **exactly 14 days** ago | Counts in `last14` (`ageDays ≤ 14`), not `prev14` |
| SC-04 | Signal observedAt **exactly 15 days** ago | Counts in `prev14` (15–28), not `last14` |
| SC-05 | Signal observedAt **exactly 28 days** ago | In `prev14`; day 29 is neither last14 nor prev14 |
| SC-06 | Signal observedAt **in the future** | Rejected by zod (API + MCP); never stored |
| SC-07 | `count = 8`, `sources = 2` | **Not** Strong (needs sources ≥ 3); may be Emerging or Weak per other gates |
| SC-08 | `count = 7`, `sources = 3` | **Not** Strong; check Emerging else Weak |
| SC-09 | Emerging: `last14 = 1`, `prev14 = 1` | Emerging allowed (`last14 ≥ prev14`) |
| SC-10 | Emerging: `last14 = 1`, `prev14 = 2` | **Not** Emerging (velocity falling) → Weak unless Fading/Strong |
| SC-11 | Emerging: `count = 3`, `sources = 2`, `last14 = 0` | **Not** Emerging (`last14 ≥ 1` fails) |
| SC-12 | All signals > 30 days but count ≥ 8 and sources ≥ 3 | **Fading wins** (evaluated first) |
| SC-13 | Polarity tie (e.g. 2 risk, 2 opportunity) | Stable rule: **Neutral** on tie (document in scoring) |
| SC-14 | Single signal, sentiment risk | Polarity Risk |
| SC-15 | Strength Σ rounds to 1 decimal | e.g. 1.25 → 1.3 or banker’s — use fixed `Math.round(x * 10) / 10` |
| SC-16 | Weekly buckets: signal on week boundary | Assign to exactly one of 8 buckets; no double-count |
| SC-17 | Empty theme weeklyCounts | Array of 8 zeros; sparkline flat |
| SC-18 | GST seed: exactly 2 `sales_call` ≤ 10d | Status **Weak**; `nextStatusHint` points toward Emerging |
| SC-19 | GST + 2 `customer_call` same day | Flips **Weak → Emerging**; statusChange recorded |
| SC-20 | Adding signal that does **not** change status | Activity without `statusChange` (or only “added signal” text) |

---

## 2. Validation & input limits

| ID | Edge case | Expected behaviour |
|---|---|---|
| VAL-01 | Quote length **2** chars | 400 / MCP error; not stored |
| VAL-02 | Quote length **3** chars | Accepted (min) |
| VAL-03 | Quote length **1000** chars | Accepted (max) |
| VAL-04 | Quote length **1001** chars | Rejected |
| VAL-05 | Summary **161** chars | Rejected |
| VAL-06 | Summary empty / omitted | Reject per schema (summary required unless explicitly optional — treat as required ≤ 160) |
| VAL-07 | Theme name **1** char | Rejected |
| VAL-08 | Theme name **2** / **80** chars | Accepted |
| VAL-09 | Theme name **81** chars | Rejected |
| VAL-10 | Theme name `"  GST  "` | Trimmed; uniqueness on trimmed case-insensitive value |
| VAL-11 | Theme name `"gst"` vs `"GST"` | Conflict — second create fails (409 / helpful MCP error) |
| VAL-12 | `add_signals` with **0** items | Rejected |
| VAL-13 | `add_signals` with **21** items | Rejected |
| VAL-14 | Item with **both** `themeId` and `newThemeName` | Rejected |
| VAL-15 | Item with **neither** `themeId` nor `newThemeName` | Rejected |
| VAL-16 | Invalid `sourceType` / `sentiment` enum | Rejected |
| VAL-17 | Malformed ISO `observedAt` | Rejected |
| VAL-18 | Unknown `themeId` | MCP: *"themeId not found. Call list_themes first."*; API 404 |
| VAL-19 | XSS payload in quote (`<script>…`) | Stored as plain text; rendered as text only (no HTML) |
| VAL-20 | Extremely long `sourceDetail` / `segment` | Cap or reject via schema (recommend ≤ 200); never break layout |

---

## 3. Store integrity & concurrency

| ID | Edge case | Expected behaviour |
|---|---|---|
| ST-01 | Redis key missing | Auto-reseed; warn in logs; healthy `/api/state` |
| ST-02 | Redis JSON fails schema validation | Reseed + warn; do not crash UI |
| ST-03 | Delete theme that still has signals | Blocked (409); message explains why |
| ST-04 | Delete empty theme | Allowed; removed from board |
| ST-05 | Merge theme A → B | All A signals move to B; A deleted; UI can route to B |
| ST-06 | Merge A → A (same id) | Rejected |
| ST-07 | Merge missing source or target | 404 / helpful error |
| ST-08 | Signal `themeId` pointing at deleted theme | Prevented by integrity checks; self-heal should not leave orphans — if found on load, reseed or quarantine |
| ST-09 | Two writers (Claude + UI) same moment | CAS version check; loser retries ≤ 3; no silent overwrite |
| ST-10 | CAS fails 3 times | Return 409/503 with clear error; UI toast; MCP readable error |
| ST-11 | `POST /api/reset` mid-poll | Next poll shows seed; no blank screen |
| ST-12 | Version field missing in old blob | Treat as invalid → reseed |
| ST-13 | Activity list grows very large | Store may keep rolling window; UI shows last 12 only |
| ST-14 | Duplicate signal ids | Generator must be unique (`uuid`); never collide in batch |

---

## 4. API & HTTP

| ID | Edge case | Expected behaviour |
|---|---|---|
| API-01 | `GET /api/state` with warm cache | `Cache-Control: no-store`; always fresh |
| API-02 | PATCH unknown signal id | 404 `{ error: { code, message } }` |
| API-03 | DELETE unknown theme | 404 |
| API-04 | Malformed JSON body | 400 |
| API-05 | Redis down | 500/503 with message; `error.tsx` / toast — no blank crash |
| API-06 | `GET /api/health` with empty DB | After self-heal: `ok: true`, signal count from seed |
| API-07 | CORS / MCP wrong path | `/api/mcp` only; wrong transport returns clear failure |

---

## 5. MCP / Claude tools

| ID | Edge case | Expected behaviour |
|---|---|---|
| MCP-01 | Claude skips `list_themes` | Server instructions discourage; if bad `themeId`, error tells Claude to call `list_themes` |
| MCP-02 | `newThemeName` matches existing (diff casing) | Reuse existing theme; do not create duplicate |
| MCP-03 | Batch mixes existing + new themes | All succeed or fail atomically per CAS transaction (preferred: one store write) |
| MCP-04 | Partial invalid item in batch of 10 | Whole batch rejected with index/field error |
| MCP-05 | `search_signals` empty query | Return recent/all up to 25 (or require ≥1 filter — pick and document; prefer: allow empty → first 25) |
| MCP-06 | `search_signals` no matches | Empty array, not error |
| MCP-07 | `get_trends` with unknown status filter | Reject or empty; prefer zod reject |
| MCP-08 | Tool returns URLs | Always include dashboard + relevant theme links using `NEXT_PUBLIC_APP_URL` |
| MCP-09 | Inspector vs Claude connector | Same tools; no auth either path |
| MCP-10 | `mcp-handler` pulls `ai` package | Do not ship; use `@modelcontextprotocol/sdk`; `check:no-ai` fails build |

---

## 6. UI / client sync

| ID | Edge case | Expected behaviour |
|---|---|---|
| UI-01 | First load slow network | Skeletons; no spinners |
| UI-02 | Tab hidden 5 minutes | Polling paused; resume on visible without burst errors |
| UI-03 | Optimistic PATCH then server 500 | Rollback UI + error toast |
| UI-04 | Poll arrives during optimistic edit | Must not clobber newer optimistic state incorrectly; reconcile via SWR mutate |
| UI-05 | Search with no matches | Empty board state + clear copy |
| UI-06 | Open `/themes/not-a-real-id` | `not-found` page |
| UI-07 | Keyboard `N` while typing in quote textarea | Must **not** open another new-signal sheet |
| UI-08 | `Esc` with sheet open | Closes sheet; second Esc no-op or blurs |
| UI-09 | `prefers-reduced-motion: reduce` | No spring column glide / glow |
| UI-10 | Status change toast “View” | Opens correct theme |
| UI-11 | Multiple Claude activities in one poll | Toast aggregates (“added N signals”) |
| UI-12 | Theme name 2-line overflow | Clamp; no card height blow-up |
| UI-13 | Mobile narrow width | Columns stack; usable enough (polish not required) |
| UI-14 | Reset without confirm | Must require confirm dialog |
| UI-15 | Merge animation + navigation | Signals move; user lands on target theme |

---

## 7. Seed & demo-specific

| ID | Edge case | Expected behaviour |
|---|---|---|
| SEED-01 | Seed run on another calendar day | Relative dates → statuses still match targets; `assertSeedStatuses` throws if not |
| SEED-02 | Manual edit then Reset | Full reseed; GST back to Weak |
| SEED-03 | Half signals `via: 'claude'` | Metrics `% via Claude` ≈ 50% (± rounding) |
| SEED-04 | No real company/person names | Anonymised segments only |
| SEED-05 | UPI theme fading | Both signals ≥ 40 days; column Fading |

---

## 8. Security & compliance (lightweight)

| ID | Edge case | Expected behaviour |
|---|---|---|
| SEC-01 | AI SDK in dependencies | `npm run check:no-ai` fails |
| SEC-02 | `dangerouslySetInnerHTML` with user text | Forbidden |
| SEC-03 | Unauthenticated MCP write | Allowed by design (demo); no secrets in client bundle beyond public URL |
| SEC-04 | Env tokens leaked to client | Only `NEXT_PUBLIC_*` public; Redis tokens server-only |

---

## 9. Stretch (Phase 4) edge cases

| ID | Edge case | Expected behaviour |
|---|---|---|
| HY-01 | Hypothesis with 0 links | Inconclusive; support% N/A or 0 |
| HY-02 | Exactly 3 links at 70% support | Leaning true |
| HY-03 | 69% with 3+ links | Inconclusive |
| HY-04 | Share slug for deleted theme | 404 / not-found |
| HY-05 | Share page indexing | `noindex` |

---

## Priority when time-boxed

1. **Must handle:** SC-12, SC-18/19, VAL-14/15/18, ST-01/03/09, MCP-02/10, UI-03/06, SEED-01, SEC-01/02  
2. **Should handle:** date boundaries SC-02–05, CAS ST-10, batch VAL-12/13, UI-02/07/09  
3. **Nice:** HY-*, ultra-long optional fields, activity cap internals  
