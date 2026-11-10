import { NextResponse } from 'next/server'
import { handleRouteError } from '@/lib/api'
import { signalCreateSchema } from '@/lib/schemas'
import { createSignal } from '@/lib/store'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const input = signalCreateSchema.parse(body)
    const result = await createSignal(input, 'web')
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    return handleRouteError(err)
  }
}
