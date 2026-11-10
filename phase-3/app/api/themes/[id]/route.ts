import { NextResponse } from 'next/server'
import { handleRouteError } from '@/lib/api'
import { themeRenameSchema } from '@/lib/schemas'
import { deleteTheme, renameTheme } from '@/lib/store'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params
    const body = await request.json()
    const input = themeRenameSchema.parse(body)
    const theme = await renameTheme(id, input, 'web')
    return NextResponse.json({ theme })
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params
    await deleteTheme(id, 'web')
    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleRouteError(err)
  }
}
