import { NextResponse } from 'next/server'
import { handleRouteError } from '@/lib/api'
import { getHealth } from '@/lib/store'

export async function GET() {
  try {
    const health = await getHealth()
    return NextResponse.json(health, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    return handleRouteError(err)
  }
}
