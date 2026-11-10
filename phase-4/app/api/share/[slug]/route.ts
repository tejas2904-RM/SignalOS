import { NextResponse } from 'next/server'
import { handleRouteError } from '@/lib/api'
import { getSharePage } from '@/lib/store'

type Ctx = { params: Promise<{ slug: string }> }

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const { slug } = await ctx.params
    const page = await getSharePage(slug)
    return NextResponse.json(page, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    return handleRouteError(err)
  }
}
