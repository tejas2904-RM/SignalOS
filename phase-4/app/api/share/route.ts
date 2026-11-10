import { NextResponse } from 'next/server'
import { handleRouteError } from '@/lib/api'
import { shareCreateSchema } from '@/lib/schemas'
import { ensureThemeShare } from '@/lib/store'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const input = shareCreateSchema.parse(body)
    const result = await ensureThemeShare(input.themeId, 'web')
    return NextResponse.json(result)
  } catch (err) {
    return handleRouteError(err)
  }
}
