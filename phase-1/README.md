# SignalOS — Phase 1 (Foundation)

Plain board + scoring + store + APIs. No MCP / premium UI yet (Phases 2–3).

**Principle:** Claude matches meaning. SignalOS does the maths. Zero AI inside.

## Run

```bash
cd phase-1
npm install
cp .env.local.example .env.local   # optional Redis; memory fallback if unset
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm test` | Scoring / schema / seed / store unit tests |
| `npm run check:no-ai` | Fail if forbidden AI packages are in dependencies |

## Verify Phase 1

```bash
npm run check:no-ai
npm test
npm run dev
# GET  /api/health
# POST /api/reset
# GET  /api/state  → GST theme status should be "weak"
```

## Layout

- `lib/scoring.ts` — pure status / strength maths
- `lib/store.ts` — sole read/write surface (Redis CAS or memory)
- `lib/seed.ts` — Indian SMB spend demo (~18 signals)
- `app/api/*` — state, health, reset, signals, themes
- `components/PlainBoard.tsx` — unstyled 4-column proof UI
