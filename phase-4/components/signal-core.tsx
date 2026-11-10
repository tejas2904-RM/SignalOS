'use client'

import EmberHusk from '@/components/ember-husk'

/**
 * Signal core — transparent WebGL over flat white page (no card/frame).
 */
export function SignalCore({ className }: { className?: string }) {
  return (
    <div
      className={className}
      style={{
        width: 340,
        height: 300,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flexShrink: 0,
        marginRight: -28,
        marginTop: -28,
        pointerEvents: 'none',
      }}
      aria-hidden
    >
      <div
        style={{
          width: 340,
          height: 280,
          position: 'relative',
          pointerEvents: 'auto',
          background: 'transparent',
        }}
      >
        <EmberHusk
          size={5}
          quality="high"
          beads={3}
          background={{
            color: '#FFFFFF',
            glowColor: '#2FD27A',
            glow: 1,
          }}
          structure={{
            shards: 19,
            irregularity: 6,
            thickness: 5,
          }}
          rock={{
            color: '#0E0E0E',
            weathering: 4,
            seam: 5,
          }}
          core={{
            color: '#2FD27A',
            hotColor: '#9AF5C0',
            intensity: 5,
            flow: 4,
          }}
          crosses={{
            count: 36,
            size: 4,
            thickness: 4,
            color: '#B0B0B0',
            spread: 6,
          }}
          debris={{
            count: 32,
            size: 4,
            spread: 6,
          }}
          entrance={{
            scatter: 6,
            tumble: 5,
            stagger: 4,
          }}
          response={{
            reach: 5,
            strength: 5,
            repel: 5,
            settle: 5,
          }}
          drift={{
            spin: 3,
            bob: 3,
            sway: 3,
          }}
          glow={{
            strength: 3,
            radius: 5,
            threshold: 5,
          }}
          style={{
            borderRadius: 0,
            background: 'transparent',
          }}
        />
      </div>
      <p
        style={{
          marginTop: -4,
          textAlign: 'center',
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--secondary)',
        }}
      >
        Signal core · 19 fragments
      </p>
    </div>
  )
}
