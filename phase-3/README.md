# SignalOS — Phase 3 (Premium UI)

Turns conversations into market intelligence. Claude matches meaning; SignalOS does the maths. **Zero AI inside.**

**No login needed.**

## Local

```bash
cd phase-3
npm install
cp .env.local.example .env.local
npm run dev
```

- App: http://localhost:3000  
- MCP: http://localhost:3000/api/mcp  

## Live / MCP (after Vercel deploy)

- Live URL: `https://<app>.vercel.app` (no login)  
- MCP URL: `https://<app>.vercel.app/api/mcp`

### Connect Claude (3 steps)

1. Claude → **Settings / Customize → Connectors → Add custom connector**  
2. Paste the MCP URL, name it **SignalOS**, add it  
3. In a chat: **+ → Connectors** → enable **SignalOS**

Custom connectors may require a paid Claude plan.

### Example prompts

- *I spoke to two finance managers at small manufacturing firms. Both lose GST input credit every month because vendor invoices go missing. Save these as signals.*  
- *What are our emerging risks right now? Quote the evidence.*  
- *Search our signals about reimbursements and summarise what customers are saying.*

## No AI inside

All scoring is plain TypeScript. No OpenAI/Anthropic/Gemini SDKs.

```bash
npm run check:no-ai
```

## Scoring (short)

1. **Fading** — no signal in last 30 days  
2. **Strong** — ≥8 signals and ≥3 source types  
3. **Emerging** — ≥3 signals, ≥2 sources, last14 ≥1 and last14 ≥ prev14  
4. **Weak** — everything else  

Strength = Σ(source weight × recency), recency = 0.5^(ageDays/30).

## Architecture (3 bullets)

1. Browser UI and Claude MCP tools share the same mutation surface  
2. Everything goes through `lib/store.ts` (versioned CAS writes)  
3. One Redis document `signalos:data` — status/strength computed on read  

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | App + MCP |
| `npm test` | Unit tests |
| `npm run check:no-ai` | Forbidden AI package guard |
| `npm run smoke -- <url>` | Health + 4 MCP tools + GST Weak→Emerging |

## Demo checklist (§12)

1. Board loads (skeleton → columns); GST in **Weak**; live dot pulses  
2. Claude GST notes → Weak → Emerging + link  
3. Toast + card glide into Emerging + glow within ~3s  
4. Theme page: Why Emerging? green; via Claude badges  
5. Edit sentiment / rename theme — instant recalc  
6. Claude: emerging risks → `get_trends` with quotes  
