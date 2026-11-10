import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const FORBIDDEN = new Set([
  'openai',
  '@anthropic-ai/sdk',
  'anthropic',
  '@google/generative-ai',
  'cohere-ai',
  'ai',
  'langchain',
  'llamaindex',
  '@pinecone-database/pinecone',
])

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'))
const deps = {
  ...pkg.dependencies,
  ...pkg.optionalDependencies,
}

const offenders = Object.keys(deps).filter((name) => {
  if (FORBIDDEN.has(name)) return true
  if (name === 'langchain' || name.startsWith('@langchain/')) return true
  return false
})

if (offenders.length > 0) {
  console.error('check:no-ai failed. Forbidden AI packages found:')
  for (const name of offenders) console.error(`  - ${name}`)
  process.exit(1)
}

console.log('check:no-ai passed')
