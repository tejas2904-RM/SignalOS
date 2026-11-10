import { NextResponse } from 'next/server'
import { handleRouteError } from '@/lib/api'
import { resetDemo } from '@/lib/store'

export async function POST() {
  try {
    const state = await resetDemo()
    return NextResponse.json(state)
  } catch (err) {
    return handleRouteError(err)
  }
}
