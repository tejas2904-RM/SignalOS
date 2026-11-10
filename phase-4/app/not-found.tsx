import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="mb-2 text-[20px] font-semibold">Page not found</h1>
      <p className="mb-4 text-[14px] text-[var(--muted)]">
        That theme or route does not exist.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] text-white"
      >
        Back to SignalOS
      </Link>
    </div>
  )
}
