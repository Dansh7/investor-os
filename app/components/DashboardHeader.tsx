'use client'

import { useState, useEffect } from 'react'

interface Props {
  ilsRate:          number | null
  ilsChangePercent: number | null
  currency:         'USD' | 'ILS'
  setCurrency:      (c: 'USD' | 'ILS') => void
  pricesLoading:    boolean
}

const BEBAS = "var(--font-bebas), 'Bebas Neue', sans-serif"
const MONO  = "var(--font-dm-mono), 'DM Mono', monospace"
const SANS  = "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif"
const TEAL  = '#00e5cc'

function LiveClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span style={{ fontFamily: BEBAS, fontSize: 44, color: '#ffffff', letterSpacing: '0.04em', lineHeight: 1 }}>
      {time}
    </span>
  )
}

export function DashboardHeader({ ilsRate, ilsChangePercent, currency, setCurrency, pricesLoading }: Props) {
  const chgPos   = (ilsChangePercent ?? 0) >= 0
  const chgColor = chgPos ? '#00ff87' : '#ff3b3b'
  const chgSign  = chgPos ? '+' : ''

  const toggleCurrency = () => {
    const next = currency === 'USD' ? 'ILS' : 'USD'
    setCurrency(next)
    localStorage.setItem('currency', next)
  }

  return (
    <header style={{
      height: 72,
      background: '#080808',
      borderBottom: '1px solid #161616',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 36px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      flexShrink: 0,
    }}>

      {/* ── Logo ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 9,
          background: 'rgba(0,229,204,0.08)',
          border: '1px solid rgba(0,229,204,0.16)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontFamily: BEBAS, fontSize: 24, color: TEAL, lineHeight: 1 }}>₪</span>
        </div>
        <span style={{ fontFamily: SANS, fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}>
          <span style={{ color: '#ffffff' }}>Investor </span>
          <span style={{ color: TEAL }}>DS</span>
        </span>
      </div>

      {/* ── Right ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>

        {/* USD / ILS — inline, no box */}
        {ilsRate != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: '#666', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4, fontWeight: 500 }}>
                USD / ILS
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontFamily: BEBAS, fontSize: 36, color: '#e8e8e8', letterSpacing: '0.04em', lineHeight: 1 }}>
                  {ilsRate.toFixed(4)}
                </span>
                {ilsChangePercent != null && (
                  <span style={{
                    fontFamily: MONO, fontSize: 13, color: chgColor,
                    fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3,
                  }}>
                    {chgSign}{ilsChangePercent.toFixed(2)}%
                    <span style={{ fontSize: 11 }}>{chgPos ? '▲' : '▼'}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Currency toggle */}
            <button
              onClick={toggleCurrency}
              title={`Switch to ${currency === 'USD' ? 'ILS' : 'USD'}`}
              style={{
                width: 34, height: 34, borderRadius: 8,
                background: '#111',
                border: '1px solid #222',
                color: '#555', fontSize: 14, fontWeight: 700,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: SANS,
                transition: 'border-color 0.12s, color 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#3a3a3a'; e.currentTarget.style.color = '#e0e0e0' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#222'; e.currentTarget.style.color = '#555' }}
            >
              {currency === 'USD' ? '$' : '₪'}
            </button>
          </div>
        )}

        {/* Separator */}
        <div style={{ width: 1, height: 30, background: '#1a1a1a', flexShrink: 0 }} />

        {/* Clock + LIVE */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#666', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 1, fontWeight: 500 }}>
            {pricesLoading ? 'Syncing…' : 'Just now'}
          </div>
          <LiveClock />
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <span className="live-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: '#00ff87', display: 'inline-block' }} />
            <span style={{ fontFamily: MONO, fontSize: 10, color: '#00ff87', letterSpacing: '0.10em', fontWeight: 600 }}>LIVE</span>
          </div>
        </div>

      </div>
    </header>
  )
}
