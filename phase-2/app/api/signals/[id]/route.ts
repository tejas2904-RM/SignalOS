import { NextResponse } from 'next/server'
import { handleRouteError } from '@/lib/api'
import { signalUpdateSchema } from '@/lib/schemas'
import { deleteSignal, updateSignal } from '@/lib/store'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params
    const body = await request.json()
    const patch = signalUpdateSchema.parse(body)
    const result = await updateSignal(id, patch, 'web')
    return NextResponse.json(result)
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params
    const result = await deleteSignal(id, 'web')
    return NextResponse.json(result)
  } catch (err) {
    return handleRouteError(err)
  }
}
