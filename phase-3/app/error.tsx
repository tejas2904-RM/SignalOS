'use client'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="mb-2 text-[20px] font-semibold">Something went wrong</h1>
      <p className="mb-4 text-[14px] text-[var(--muted)]">
        {error.message || 'Unexpected error'}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] text-white"
      >
        Try again
      </button>
    </div>
  )
}
