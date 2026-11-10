export class AppError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = status
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError
}
