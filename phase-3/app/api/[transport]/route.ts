import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { createSignalOsMcpServer } from '@/lib/mcp/create-server'

export const runtime = 'nodejs'

const ALLOWED = new Set(['mcp'])

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Accept, mcp-session-id, mcp-protocol-version, Last-Event-ID',
    'Access-Control-Expose-Headers': 'mcp-session-id, mcp-protocol-version',
  }
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers)
  for (const [k, v] of Object.entries(corsHeaders())) {
    headers.set(k, v)
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

type Ctx = { params: Promise<{ transport: string }> }

async function handleMcp(request: Request): Promise<Response> {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    // JSON responses work reliably on Vercel serverless / Next route handlers
    enableJsonResponse: true,
  })
  const server = createSignalOsMcpServer()
  await server.connect(transport)
  const response = await transport.handleRequest(request)
  return withCors(response)
}

export async function OPTIONS(_request: Request, ctx: Ctx) {
  const { transport } = await ctx.params
  if (!ALLOWED.has(transport)) {
    return new Response('Not found', { status: 404 })
  }
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function GET(request: Request, ctx: Ctx) {
  const { transport } = await ctx.params
  if (!ALLOWED.has(transport)) {
    return new Response('Not found', { status: 404 })
  }
  return handleMcp(request)
}

export async function POST(request: Request, ctx: Ctx) {
  const { transport } = await ctx.params
  if (!ALLOWED.has(transport)) {
    return new Response('Not found', { status: 404 })
  }
  return handleMcp(request)
}

export async function DELETE(request: Request, ctx: Ctx) {
  const { transport } = await ctx.params
  if (!ALLOWED.has(transport)) {
    return new Response('Not found', { status: 404 })
  }
  return handleMcp(request)
}
