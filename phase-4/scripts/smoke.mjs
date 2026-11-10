#!/usr/bin/env node
/**
 * Phase 4 smoke: health + MCP tools including list_hypotheses + share.
 * Usage: npm run smoke -- http://localhost:3000
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const base = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '')
const mcpEndpoint = `${base}/api/mcp`

function parseToolText(result) {
  const text = result?.content?.find((c) => c.type === 'text')?.text
  if (!text) throw new Error(`No text content in tool result: ${JSON.stringify(result)}`)
  if (result.isError) throw new Error(text)
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function callTool(client, name, args = {}) {
  const result = await client.callTool({ name, arguments: args })
  return parseToolText(result)
}

async function main() {
  const healthRes = await fetch(`${base}/api/health`)
  const health = await healthRes.json()
  if (!health.ok) throw new Error(`health failed: ${JSON.stringify(health)}`)

  await fetch(`${base}/api/reset`, { method: 'POST' })

  const client = new Client({ name: 'signalos-smoke', version: '0.4.0' })
  const transport = new StreamableHTTPClientTransport(new URL(mcpEndpoint))
  await client.connect(transport)

  const tools = await client.listTools()
  const names = tools.tools.map((t) => t.name).sort()
  const expected = [
    'add_signals',
    'get_trends',
    'list_hypotheses',
    'list_themes',
    'search_signals',
  ]
  for (const name of expected) {
    if (!names.includes(name)) {
      throw new Error(`Missing tool ${name}. Got: ${names.join(', ')}`)
    }
  }

  const listed = await callTool(client, 'list_themes', {})
  const gst = listed.themes?.find((t) => String(t.name).toLowerCase().includes('gst input credit'))
  if (!gst || gst.status !== 'weak') {
    throw new Error(`Expected GST weak from list_themes, got ${JSON.stringify(gst)}`)
  }

  const hyps = await callTool(client, 'list_hypotheses', {})
  if (!Array.isArray(hyps.hypotheses) || hyps.hypotheses.length < 1) {
    throw new Error(`Expected seeded hypothesis, got ${JSON.stringify(hyps)}`)
  }
  const hypId = hyps.hypotheses[0].id

  const added = await callTool(client, 'add_signals', {
    signals: [
      {
        themeId: gst.id,
        quote: 'We lose GST input credit when vendor invoices go missing.',
        summary: 'Lost ITC from missing invoices',
        sourceType: 'customer_call',
        sentiment: 'opportunity',
        hypothesisLinks: [{ hypothesisId: hypId, stance: 'supports' }],
      },
      {
        themeId: gst.id,
        quote: 'Finance managers chase vendors every month for GST invoices.',
        summary: 'Manual invoice chase',
        sourceType: 'customer_call',
        sentiment: 'opportunity',
      },
    ],
  })

  const flipped = (added.statusChanges || []).some((line) =>
    /weak\s*→\s*emerging/i.test(String(line)),
  )
  if (!flipped) {
    throw new Error(`Expected Weak → Emerging in add_signals result: ${JSON.stringify(added)}`)
  }

  const afterHyps = await callTool(client, 'list_hypotheses', {})
  const updated = afterHyps.hypotheses.find((h) => h.id === hypId)
  if (!updated || updated.linkCount < 2) {
    throw new Error(`Expected hypothesis linkCount >= 2, got ${JSON.stringify(updated)}`)
  }

  const shareRes = await fetch(`${base}/api/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ themeId: gst.id }),
  })
  const share = await shareRes.json()
  if (!share.urlPath?.startsWith('/share/')) {
    throw new Error(`share failed: ${JSON.stringify(share)}`)
  }
  const slug = share.share?.slug || share.urlPath.replace('/share/', '')
  const shareApi = await fetch(`${base}/api/share/${slug}`)
  if (!shareApi.ok) throw new Error(`share api HTTP ${shareApi.status}`)
  const sharePage = await fetch(`${base}${share.urlPath}`)
  if (!sharePage.ok) throw new Error(`share page HTTP ${sharePage.status}`)

  await fetch(`${base}/api/reset`, { method: 'POST' })
  await client.close()
  console.log(
    `smoke ok · ${base} · mcp ${mcpEndpoint} · tools ${expected.join(',')} · GST Weak→Emerging · hypotheses+share`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
