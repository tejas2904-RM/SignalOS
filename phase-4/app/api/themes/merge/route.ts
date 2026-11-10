import { NextResponse } from 'next/server'
import { handleRouteError } from '@/lib/api'
import { themeMergeSchema } from '@/lib/schemas'
import { mergeThemes } from '@/lib/store'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const input = themeMergeSchema.parse(body)
    const result = await mergeThemes(input.sourceId, input.targetId, 'web')
    return NextResponse.json(result)
  } catch (err) {
    return handleRouteError(err)
  }
}
