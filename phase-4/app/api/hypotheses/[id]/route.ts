import { NextResponse } from 'next/server'
import { handleRouteError } from '@/lib/api'
import { hypothesisUpdateSchema } from '@/lib/schemas'
import { updateHypothesis } from '@/lib/store'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params
    const body = await request.json()
    const patch = hypothesisUpdateSchema.parse(body)
    const hypothesis = await updateHypothesis(id, patch, 'web')
    return NextResponse.json({ hypothesis })
  } catch (err) {
    return handleRouteError(err)
  }
}
