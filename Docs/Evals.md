# SignalOS — Evals

> Pass/fail evaluation rubrics for the assignment demo, automated checks, and reviewer experience.  
> Use with `Tests.md` (how to run) and `EdgeCases.md` (what can go wrong).  
> **Primary bar:** the §12 live demo on the public URL.

---

## Scoring model

Each eval is graded:

| Grade | Meaning |
|---|---|
| **PASS** | Meets the criterion without workarounds |
| **PARTIAL** | Works but flaky, incomplete UX, or missing polish |
| **FAIL** | Broken, missing, or violates a hard constraint |

**Assignment ship rule:** all **Hard Gate** evals = PASS. Soft evals may be PARTIAL if time-boxed; Phase 4 is optional.

---

## 1. Hard gates (must PASS)

### E-HARD-01 — Works from Claude via MCP
| Field | Value |
|---|---|
| **Eval** | A prompt in Claude creates real signals in the app through MCP |
| **Method** | Connect custom connector → paste GST notes → inspect tool calls |
| **PASS** | `list_themes` then `add_signals` succeed; data visible via `/api/state` and UI |
| **FAIL** | No MCP URL, tools missing, auth blocking, or writes don’t persist |

### E-HARD-02 — Human can edit
| Field | Value |
|---|---|
| **Eval** | Reviewer opens app, sees Claude-created data, edits it |
| **Method** | After Claude write: rename theme, edit signal sentiment, verify recalc |
| **PASS** | Edits persist; scoring updates; no login required |
| **FAIL** | Read-only, login wall, or edits don’t stick |

### E-HARD-03 — Live on the internet
| Field | Value |
|---|---|
| **Eval** | Public Vercel URL works without credentials |
| **Method** | Open URL in private window |
| **PASS** | Dashboard loads; `/api/health` ok |
| **FAIL** | Localhost-only, 401, or blank deploy |

### E-HARD-04 — No AI inside the app
| Field | Value |
|---|---|
| **Eval** | No AI SDKs / keys / in-app model calls |
| **Method** | `npm run check:no-ai`; scan deps; confirm scoring is TypeScript |
| **PASS** | Guard passes; principle visible in UI + README |
| **FAIL** | Forbidden package present or app calls an LLM API |

### E-HARD-05 — Submission artifacts
| Field | Value |
|---|---|
| **Eval** | Live link + MCP link + connect steps provided |
| **Method** | README review |
| **PASS** | All three present and accurate |
| **FAIL** | Missing MCP URL or steps |

---

## 2. Demo evals (§12) — primary quality bar

Run on **production** after `POST /api/reset` (or fresh seed).

| ID | Step | PASS criteria | Weight |
|---|---|---|---|
| E-DEMO-01 | Dashboard loads | Skeleton → board; no spinner-only flash; GST in **Weak**; live dot pulses | Critical |
| E-DEMO-02 | Claude GST prompt | Claude calls `list_themes` then `add_signals`; reply includes **Weak → Emerging** and a link | Critical |
| E-DEMO-03 | Live sync ≤ 3s | Toast “✦ Claude added 2 signals”; GST card **glides** to Emerging; glow; counts tick; activity shows status change | Critical |
| E-DEMO-04 | Theme deep-dive | “Why Emerging?” checklist all met/green; new quotes show **via Claude** | Critical |
| E-DEMO-05 | Human edit | Sentiment edit + rename feel instant; maths recalculate | High |
| E-DEMO-06 | Trends Q&A | Claude uses `get_trends` / search and **quotes stored evidence** | High |

### Demo score
- **Ship:** E-DEMO-01…04 = PASS; 05–06 ≥ PARTIAL  
- **Excellent:** all six PASS  

### E-DEMO-03 partial rules
| Observation | Grade |
|---|---|
| Glide + toast + glow all work | PASS |
| Status updates within 3s but no layout animation | PARTIAL |
| Need manual refresh to see change | FAIL |
| Toast missing but card moves | PARTIAL |

---

## 3. Scoring maths evals

| ID | Eval | Method | PASS |
|---|---|---|---|
| E-MATH-01 | Status priority | Unit: old strong-like theme | Fading wins |
| E-MATH-02 | Strong gate | Unit fixtures | Only count≥8 AND sources≥3 |
| E-MATH-03 | Emerging gate | Unit fixtures | All four conditions required |
| E-MATH-04 | GST golden path | Seed + append 2 customer_call | Weak → Emerging |
| E-MATH-05 | Seed invariants | `assertSeedStatuses` | Never throws for relative seed |
| E-MATH-06 | Transparency | Theme page | `reasons` + `nextStatusHint` match actual status |
| E-MATH-07 | Strength display | Spot-check | One decimal; mono tabular nums |

**PASS bar:** E-MATH-01…06 PASS (`npm test` green + manual Why-card spot check).

---

## 4. Architecture evals

| ID | Eval | PASS |
|---|---|---|
| E-ARCH-01 | Single store | UI routes and MCP both call `lib/store.ts` — no duplicated write logic |
| E-ARCH-02 | Single document | One Redis key `signalos:data` |
| E-ARCH-03 | Score on read | Status/strength not persisted as source of truth |
| E-ARCH-04 | CAS writes | Versioned compare-and-set with retries |
| E-ARCH-05 | Shared zod | API + MCP use `lib/schemas.ts` |
| E-ARCH-06 | One state endpoint | Client polls `GET /api/state` only for board data |

---

## 5. Robustness evals

| ID | Eval | Method | PASS |
|---|---|---|---|
| E-ROB-01 | Self-heal | Delete Redis key → hit `/api/state` | Reseeds; UI works |
| E-ROB-02 | Validation errors | Bad POST bodies | `{ error: { code, message } }` + correct HTTP |
| E-ROB-03 | MCP helpful errors | Bad themeId | Instructs `list_themes` |
| E-ROB-04 | Theme delete guard | Delete non-empty | Blocked |
| E-ROB-05 | Concurrent edit | Claude + UI near-simultaneous | No lost update (CAS) |
| E-ROB-06 | XSS | Quote with `<script>` | Escaped text |
| E-ROB-07 | Poll hygiene | Hidden tab | Polling pauses |
| E-ROB-08 | Health | `GET /api/health` | `{ ok, signals, version }` |
| E-ROB-09 | Smoke | `npm run smoke -- <prod>` | Exit 0 |
| E-ROB-10 | error/not-found | Force error / bad theme URL | Dedicated pages, not blank |

---

## 6. MCP evals

| ID | Eval | PASS |
|---|---|---|
| E-MCP-01 | Four tools registered | list / add / search / get_trends |
| E-MCP-02 | Read-only hints | list/search/trends marked read-only if supported |
| E-MCP-03 | Server instructions | Encourage list-first, split quotes, reuse themes, return links |
| E-MCP-04 | Theme reuse | `newThemeName` matches existing case-insensitively → reuse |
| E-MCP-05 | Batch limits | 1–20 enforced |
| E-MCP-06 | Public URL | `https://<app>.vercel.app/api/mcp` reachable |
| E-MCP-07 | Inspector parity | Local inspector works same as Claude |
| E-MCP-08 | No AI dep via MCP stack | `check:no-ai` still PASS after MCP install |

---

## 7. UX / premium feel evals

Grade subjectively but with anchors:

| ID | Dimension | PASS anchor | FAIL anchor |
|---|---|---|---|
| E-UX-01 | Visual system | Dark tokens, hairlines, status pills, Geist | Default Inter/light generic look |
| E-UX-02 | Board density | 4 columns readable; cards informative | Empty cards / clutter / emoji chrome |
| E-UX-03 | Motion | Subtle 150–250ms; GST glide is hero | No motion or noisy animation |
| E-UX-04 | Live feel | Pulsing live + sync age; Claude toast | Static page feel |
| E-UX-05 | Sheets | Signal + Connect Claude complete | Missing copy steps / prompts |
| E-UX-06 | Shortcuts | N/C//Esc work; shown in tooltips | Broken or conflict with inputs |
| E-UX-07 | Optimistic UI | Instant edit; rollback on error | Wait-for-server on every click |
| E-UX-08 | Empty/skeleton | Skeletons + useful empty copy | Spinners / blank |
| E-UX-09 | a11y basics | focus-visible accent rings; Esc closes | No focus styles |
| E-UX-10 | via Claude badge | Sparkles + text; no Anthropic logo | Missing or branded illegally |

**Soft ship bar:** E-UX-01, 03, 04, 05 ≥ PASS; others ≥ PARTIAL.

---

## 8. Product / README evals

| ID | Eval | PASS |
|---|---|---|
| E-DOC-01 | Pitch line present | Clear one-liner |
| E-DOC-02 | Live URL + no login | Stated |
| E-DOC-03 | MCP URL + 3 steps | Exact Claude connector path |
| E-DOC-04 | Example prompts | All 3 from spec |
| E-DOC-05 | No AI section | Mentions `check:no-ai` |
| E-DOC-06 | Scoring rules | Short accurate summary |
| E-DOC-07 | Architecture | Exactly ~3 bullets: UI+MCP → store → Redis |
| E-DOC-08 | Principle visible in product | Hero: *Claude matches meaning. SignalOS does the maths.* |

---

## 9. Constraint evals (assignment “never break”)

| ID | Constraint | PASS |
|---|---|---|
| E-CON-01 | Not a website builder / shop | Product is market-signal themes |
| E-CON-02 | No login / one workspace | Single demo Redis doc |
| E-CON-03 | Polish over features | No extras beyond spec (unless Phase 4 after demo) |
| E-CON-04 | MCP early build order | Evidence Phase 2 before heavy UI (process eval for builders) |

---

## 10. Phase 4 evals (optional)

Only score if Hard Gates + Demo criticals already PASS.

| ID | Eval | PASS |
|---|---|---|
| E-P4-A | Hypotheses panel | Seed hypothesis; support% + verdict; MCP list/link |
| E-P4-B | Share page | Read-only `/share/[slug]`; noindex; Built with SignalOS |

---

## 11. Weighted scorecard (reviewer sheet)

Copy/paste for a review session:

```text
HARD GATES (all must PASS)
[ ] E-HARD-01 Claude → MCP → app
[ ] E-HARD-02 Human edit
[ ] E-HARD-03 Public Vercel URL
[ ] E-HARD-04 No AI inside + check:no-ai
[ ] E-HARD-05 README submission artifacts

DEMO (§12)
[ ] E-DEMO-01 Load / GST Weak / live
[ ] E-DEMO-02 Claude tools + Weak→Emerging reply
[ ] E-DEMO-03 Toast + glide + glow ≤3s
[ ] E-DEMO-04 Why Emerging + via Claude
[ ] E-DEMO-05 Edit + rename
[ ] E-DEMO-06 get_trends evidence

MATH / ARCH / ROBUST (spot)
[ ] E-MATH-04 GST golden path
[ ] E-ARCH-01 Single store
[ ] E-ROB-09 Smoke prod
[ ] E-MCP-08 check:no-ai after MCP

UX / DOCS
[ ] E-UX-01 Visual system
[ ] E-UX-03 Motion hero
[ ] E-DOC-03 MCP steps
[ ] E-DOC-08 Principle in UI

RESULT:  PASS / PARTIAL / FAIL
Notes:
```

---

## 12. Automated eval suite mapping

| Command | Evals covered |
|---|---|
| `npm run check:no-ai` | E-HARD-04, E-MCP-08 |
| `npm test` | E-MATH-01…05, schema edges |
| `npm run smoke -- <url>` | E-ROB-08/09, E-MCP-01 basics |
| Manual §12 | E-DEMO-*, E-HARD-01…03 |
| README review | E-HARD-05, E-DOC-* |

---

## 13. Failure taxonomy (for debugging eval fails)

| Symptom | Likely area | First check |
|---|---|---|
| Claude can’t connect | MCP route / URL | `/api/mcp` + inspector |
| Tools run but UI stale | SWR / deploy Redis env | `/api/state` vs UI; env vars on Vercel |
| GST not Weak after reset | Seed dates / assert | `assertSeedStatuses`; source types |
| GST won’t go Emerging | Scoring gates / source types | Need new source type + count≥3 |
| Card doesn’t glide | Motion / layoutId | status actually changed? reduced motion? |
| `check:no-ai` red | Dependencies | Remove `ai` / langchain; switch MCP SDK |
| Lost edits under load | CAS | Lua version script + retries |

---

## 14. Final verdict rule

**PASS the assignment if and only if:**
1. All **Hard Gates** PASS, and  
2. **E-DEMO-01…04** PASS on the public URL, and  
3. `check:no-ai` PASS, and  
4. README includes live URL, MCP URL, and connect steps.

Everything else improves grade/feel but does not unblock submission.
