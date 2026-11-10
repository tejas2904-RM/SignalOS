# SignalOS — Phase 4 (Stretch)

Phase 3 premium UI **plus** hypotheses (lite) and public share pages.

**Pitch:** Claude matches meaning. SignalOS does the maths. Zero AI inside.  
**No login needed.**

## Local

```bash
cd phase-4
npm install
cp .env.local.example .env.local
npm run dev
```

- App: http://localhost:3000  
- MCP: http://localhost:3000/api/mcp  

## Phase 4 features

### Hypotheses
- Seeded: *“Automatic GST invoice capture is a reason SMBs would switch providers”* (1 supporting link)
- Panel under the board: statement, support/contradict bar, verdict
- Edit statement/status; link/unlink from the signal edit sheet
- MCP: `list_hypotheses` + optional `hypothesisLinks` on `add_signals`
- Verdict: **Leaning true** if ≥70% support with 3+ links; **Leaning false** if ≤30%; else **Inconclusive**

### Public share
- Theme page **Share** creates `/share/[slug]`
- Read-only evidence: name, status, Why checklist, quotes
- `noindex` + “Built with SignalOS” footer

## Connect Claude

1. Settings / Customize → Connectors → Add custom connector  
2. Paste `https://<app>/api/mcp`, name **SignalOS**  
3. In chat: + → Connectors → enable SignalOS  

## Scripts

```bash
npm run check:no-ai
npm test
npm run smoke -- http://localhost:3000
```

## Architecture (3 bullets)

1. UI + MCP tools share `lib/store.ts`  
2. One Redis/memory document with themes, signals, activity, hypotheses, shares  
3. Scoring (themes + hypotheses) is pure TypeScript on read — no AI inside  
