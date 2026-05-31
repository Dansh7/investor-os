'use client'

import { useState, useEffect } from 'react'

interface Props {
  ilsRate:           number | null
  ilsChangePercent:  number | null
  currency:          'USD' | 'ILS'
  setCurrency:       (c: 'USD' | 'ILS') => void
  pricesLoading:     boolean
}

const BEBAS = "var(--font-bebas), 'Bebas Neue', sans-serif"
const MONO  = "var(--font-dm-mono), 'DM Mono', monospace"
const SANS  = "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif"

function LiveClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span style={{ fontFamily: MONO, fontSize: 13, color: 'var(--text-secondary)', letterSpacing: '0.04em', fontVariantNumeric: 'tabular-nums' }}>
      {time}
    </span>
  )
}

function VSep() {
  return <div style={{ width: 1, height: 18, background: 'var(--border)', flexShrink: 0 }} />
}

export function DashboardHeader({ ilsRate, ilsChangePercent, currency, setCurrency, pricesLoading }: Props) {
  const chgColor = (ilsChangePercent ?? 0) >= 0 ? 'var(--green)' : 'var(--red)'
  const chgSign  = (ilsChangePercent ?? 0) >= 0 ? '+' : ''

  return (
    <header style={{
      height: 52,
      background: 'var(--bg-base)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      flexShrink: 0,
    }}>

      {/* ── Logo ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: BEBAS, fontSize: 22, color: 'var(--green)', letterSpacing: '0.04em', lineHeight: 1 }}>
          ₪
        </span>
        <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Investor OS
        </span>
        {pricesLoading && (
          <span style={{ fontFamily: MONO, fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            · syncing
          </span>
        )}
      </div>

      {/* ── Right controls ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>

        {/* USD/ILS rate */}
        {ilsRate && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontFamily: BEBAS, fontSize: 22, color: 'var(--text-primary)', letterSpacing: '0.04em', lineHeight: 1 }}>
              {ilsRate.toFixed(2)}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--text-secondary)' }}>₪/$</span>
            {ilsChangePercent != null && (
              <span style={{ fontFamily: MONO, fontSize: 11, color: chgColor, fontWeight: 500 }}>
                {chgSign}{ilsChangePercent.toFixed(2)}%
              </span>
            )}
          </div>
        )}

        <VSep />

        {/* Clock + LIVE dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <LiveClock />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              className="live-dot"
              style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }}
            />
            <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--green)', letterSpacing: '0.10em', fontWeight: 500 }}>
              LIVE
            </span>
          </div>
        </div>

        <VSep />

        {/* Currency toggle */}
        <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid #2a2a2a' }}>
          {(['USD', 'ILS'] as const).map(c => (
            <button
              key={c}
              onClick={() => { setCurrency(c); localStorage.setItem('currency', c) }}
              style={{
                padding: '4px 11px',
                fontSize: 11,
                fontFamily: MONO,
                fontWeight: 500,
                background: currency === c ? '#f0f0f0' : 'transparent',
                color:      currency === c ? '#000'    : '#555',
                cursor: 'pointer',
                transition: 'background 0.12s, color 0.12s',
                letterSpacing: '0.02em',
              }}
            >
              {c === 'USD' ? '$' : '₪'}
            </button>
          ))}
        </div>

      </div>
    </header>
  )
}
