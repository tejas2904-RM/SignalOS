#!/usr/bin/env node
/**
 * Phase 1 smoke: health + state. Full MCP smoke lands in Phase 2.
 * Usage: npm run smoke -- http://localhost:3000
 */
const base = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '')

async function main() {
  const health = await fetch(`${base}/api/health`).then((r) => r.json())
  if (!health.ok) throw new Error(`health failed: ${JSON.stringify(health)}`)

  await fetch(`${base}/api/reset`, { method: 'POST' })
  const state = await fetch(`${base}/api/state`).then((r) => r.json())
  const gst = state.themes?.find((t) =>
    String(t.name).toLowerCase().includes('gst input credit'),
  )
  if (!gst || gst.status !== 'weak') {
    throw new Error(`Expected GST theme weak, got ${JSON.stringify(gst)}`)
  }

  console.log(`smoke ok · ${base} · version ${state.version} · signals ${health.signals}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
