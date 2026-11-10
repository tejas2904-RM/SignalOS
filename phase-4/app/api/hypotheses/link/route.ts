import { NextResponse } from 'next/server'
import { handleRouteError } from '@/lib/api'
import { hypothesisLinkMutationSchema } from '@/lib/schemas'
import { linkHypothesisSignal, unlinkHypothesisSignal } from '@/lib/store'
import { z } from 'zod'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const input = hypothesisLinkMutationSchema.parse(body)
    const hypothesis = await linkHypothesisSignal(
      input.hypothesisId,
      input.signalId,
      input.stance,
      'web',
    )
    return NextResponse.json({ hypothesis })
  } catch (err) {
    return handleRouteError(err)
  }
}

const unlinkSchema = z.object({
  hypothesisId: z.string().min(1),
  signalId: z.string().min(1),
})

export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const input = unlinkSchema.parse(body)
    const hypothesis = await unlinkHypothesisSignal(
      input.hypothesisId,
      input.signalId,
      'web',
    )
    return NextResponse.json({ hypothesis })
  } catch (err) {
    return handleRouteError(err)
  }
}
