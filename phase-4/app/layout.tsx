import type { Metadata } from 'next'
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const instrument = Instrument_Serif({
  variable: '--font-instrument',
  subsets: ['latin'],
  weight: '400',
})

export const metadata: Metadata = {
  title: 'SignalOS',
  description: 'Claude matches meaning. SignalOS does the maths. Zero AI inside.',
  openGraph: {
    title: 'SignalOS',
    description:
      'Turn conversations into market intelligence — themes, scores, live from Claude via MCP.',
    type: 'website',
  },
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrument.variable} h-full antialiased`}
    >
      <body className="app-shell flex min-h-full flex-col text-[var(--ink)]">
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#0E0E0E',
              border: '1px solid #E0E0E0',
              color: '#FFFFFF',
            },
          }}
        />
      </body>
    </html>
  )
}
