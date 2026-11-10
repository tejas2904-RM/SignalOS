# SignalOS — Phase 2 (MCP + Deploy)

Phase 1 foundation **plus** a Streamable HTTP MCP server at `/api/mcp` so Claude can create real signals.

**Principle:** Claude matches meaning. SignalOS does the maths. Zero AI inside.

## Run locally

```bash
cd phase-2
npm install
cp .env.local.example .env.local   # optional Redis; memory fallback if unset
npm run dev
```

- App: http://localhost:3000  
- **MCP URL:** http://localhost:3000/api/mcp  

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Next.js + MCP route |
| `npm test` | Unit tests (scoring/seed/store/MCP construct) |
| `npm run check:no-ai` | Fail if forbidden AI packages appear |
| `npm run smoke -- <baseUrl>` | Health + all 4 MCP tools (incl. GST Weak→Emerging) |

## MCP tools

| Tool | Mode | Role |
|---|---|---|
| `list_themes` | read-only | Themes + status + URLs — **call first** |
| `add_signals` | write | 1–20 signals via Claude; returns status changes + links |
| `search_signals` | read-only | Text quotes/summaries (≤25) |
| `get_trends` | read-only | Scored themes, reasons, top 3 quotes |

Server instructions tell Claude to list themes first, split verbatim quotes, reuse themes by meaning, batch `add_signals`, and always return the dashboard link.

## Local MCP test (inspector)

```bash
npm run dev
npx @modelcontextprotocol/inspector
# Connect to: http://localhost:3000/api/mcp
```

1. `list_themes` → GST is **weak**  
2. `add_signals` with 2 `customer_call` items on the GST `themeId`  
3. Reply includes **Weak → Emerging**  
4. `list_themes` → GST **emerging**  
5. `POST /api/reset` to restore demo  

Or one-shot:

```bash
npm run smoke -- http://localhost:3000
```

## Connect Claude (after deploy)

1. Deploy this `phase-2` folder to Vercel; attach Upstash Redis; set `NEXT_PUBLIC_APP_URL`.  
2. MCP URL: `https://<app>.vercel.app/api/mcp`  
3. In Claude: **Settings → Customize → Connectors → Add custom connector**  
4. Paste the MCP URL, name it **SignalOS**, add it  
5. In a chat: **+ → Connectors** → enable **SignalOS**  
6. Paste: *“I spoke to two finance managers at small manufacturing firms. Both lose GST input credit every month because vendor invoices go missing. Save these as signals.”*  
7. Confirm the reply reports Weak → Emerging; refresh the live board  

> Custom connectors may require a paid Claude plan.

## Architecture (3 bullets)

1. Claude / UI → MCP tools or REST routes  
2. Both call `lib/store.ts` (CAS writes)  
3. Single Redis (or memory) document `signalos:data`; scoring is pure TypeScript on read  

## Deploy checklist

- [ ] Vercel project from `phase-2`  
- [ ] Upstash Redis env (`KV_*` or `UPSTASH_*`)  
- [ ] `NEXT_PUBLIC_APP_URL=https://<app>.vercel.app`  
- [ ] `npm run check:no-ai`  
- [ ] `npm run smoke -- https://<app>.vercel.app`  
- [ ] Claude connector pointed at `/api/mcp`  
