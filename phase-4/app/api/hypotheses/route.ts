import { NextResponse } from 'next/server'
import { handleRouteError } from '@/lib/api'
import { hypothesisCreateSchema } from '@/lib/schemas'
import { createHypothesis, getComputedState } from '@/lib/store'

export async function GET() {
  try {
    const state = await getComputedState()
    return NextResponse.json({ hypotheses: state.hypotheses })
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const input = hypothesisCreateSchema.parse(body)
    const hypothesis = await createHypothesis(input, 'web')
    return NextResponse.json({ hypothesis }, { status: 201 })
  } catch (err) {
    return handleRouteError(err)
  }
}
