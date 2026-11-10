#!/usr/bin/env node
/**
 * Phase 2 smoke: health + MCP tools (list / add / search / trends).
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

  const client = new Client({ name: 'signalos-smoke', version: '0.2.0' })
  const transport = new StreamableHTTPClientTransport(new URL(mcpEndpoint))
  await client.connect(transport)

  const tools = await client.listTools()
  const names = tools.tools.map((t) => t.name).sort()
  const expected = ['add_signals', 'get_trends', 'list_themes', 'search_signals']
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

  const added = await callTool(client, 'add_signals', {
    signals: [
      {
        themeId: gst.id,
        quote: 'We lose GST input credit when vendor invoices go missing.',
        summary: 'Lost ITC from missing invoices',
        sourceType: 'customer_call',
        sentiment: 'opportunity',
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

  const after = await callTool(client, 'list_themes', {})
  const gstAfter = after.themes?.find((t) => t.id === gst.id)
  if (!gstAfter || gstAfter.status !== 'emerging') {
    throw new Error(`Expected GST emerging after add_signals, got ${JSON.stringify(gstAfter)}`)
  }

  const search = await callTool(client, 'search_signals', { query: 'invoice' })
  if (!Array.isArray(search.signals) || search.signals.length < 1) {
    throw new Error(`search_signals returned no invoice matches: ${JSON.stringify(search)}`)
  }

  const trends = await callTool(client, 'get_trends', { status: 'emerging' })
  if (!Array.isArray(trends.themes) || trends.themes.length < 1) {
    throw new Error(`get_trends emerging empty: ${JSON.stringify(trends)}`)
  }
  const sample = trends.themes[0]
  if (!sample.reasons || !sample.topQuotes) {
    throw new Error(`get_trends missing reasons/topQuotes: ${JSON.stringify(sample)}`)
  }

  // Restore demo seed for the next reviewer
  await fetch(`${base}/api/reset`, { method: 'POST' })

  await client.close()
  console.log(
    `smoke ok · ${base} · mcp ${mcpEndpoint} · tools ${expected.join(',')} · GST Weak→Emerging`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
