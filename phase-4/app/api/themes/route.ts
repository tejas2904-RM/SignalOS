import { NextResponse } from 'next/server'
import { handleRouteError } from '@/lib/api'
import { themeCreateSchema } from '@/lib/schemas'
import { createTheme } from '@/lib/store'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const input = themeCreateSchema.parse(body)
    const theme = await createTheme(input, 'web')
    return NextResponse.json({ theme }, { status: 201 })
  } catch (err) {
    return handleRouteError(err)
  }
}
