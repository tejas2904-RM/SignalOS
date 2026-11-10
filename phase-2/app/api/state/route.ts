import { NextResponse } from 'next/server'
import { handleRouteError } from '@/lib/api'
import { getComputedState } from '@/lib/store'

export async function GET() {
  try {
    const state = await getComputedState()
    return NextResponse.json(state, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    return handleRouteError(err)
  }
}
