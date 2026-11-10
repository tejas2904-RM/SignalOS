import { PlainBoard } from '@/components/PlainBoard'

export default function HomePage() {
  return (
    <main
      style={{
        maxWidth: 1440,
        margin: '0 auto',
        padding: 32,
        width: '100%',
      }}
    >
      <PlainBoard />
    </main>
  )
}
