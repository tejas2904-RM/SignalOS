import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { isAppError } from './errors'

export function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}

export function handleRouteError(err: unknown) {
  if (isAppError(err)) {
    return jsonError(err.code, err.message, err.status)
  }
  if (err instanceof ZodError) {
    const message = err.issues.map((i) => i.message).join('; ') || 'Validation failed'
    return jsonError('VALIDATION_ERROR', message, 400)
  }
  console.error(err)
  return jsonError('INTERNAL_ERROR', 'Unexpected server error', 500)
}
