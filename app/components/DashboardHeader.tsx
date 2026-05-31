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
    <span style={{ fontFamily: BEBAS, fontSize: 38, color: '#ffffff', letterSpacing: '0.04em', lineHeight: 1 }}>
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
      height: 80,
      background: '#080808',
      borderBottom: '1px solid #1e1e1e',
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
        {/* Shekel icon */}
        <div style={{
          width: 42, height: 42, borderRadius: 10,
          background: 'rgba(0,229,204,0.08)',
          border: '1px solid rgba(0,229,204,0.20)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontFamily: BEBAS, fontSize: 26, color: TEAL, lineHeight: 1 }}>₪</span>
        </div>
        {/* Wordmark */}
        <div style={{ fontFamily: SANS, fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}>
          <span style={{ color: '#ffffff' }}>Investor </span>
          <span style={{ color: TEAL }}>OS</span>
        </div>
      </div>

      {/* ── Right side ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>

        {/* USD / ILS rate panel */}
        {ilsRate != null && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: '#0e0e0e', border: '1px solid #242424',
            borderRadius: 14, padding: '10px 18px',
          }}>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', letterSpacing: '0.10em', marginBottom: 4, textTransform: 'uppercase' }}>
                USD / ILS
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: BEBAS, fontSize: 30, color: '#ffffff', letterSpacing: '0.04em', lineHeight: 1 }}>
                  {ilsRate.toFixed(4)}
                </span>
                {ilsChangePercent != null && (
                  <>
                    <span style={{ fontFamily: MONO, fontSize: 12, color: chgColor, fontWeight: 600 }}>
                      {chgSign}{ilsChangePercent.toFixed(2)}%
                    </span>
                    <span style={{ fontSize: 13, color: chgColor }}>{chgPos ? '▲' : '▼'}</span>
                  </>
                )}
              </div>
            </div>

            {/* Currency toggle button */}
            <button
              onClick={toggleCurrency}
              title={`Switch to ${currency === 'USD' ? 'ILS' : 'USD'}`}
              style={{
                width: 40, height: 40, borderRadius: '50%',
                background: '#1a1a1a', border: '1px solid #333',
                color: '#ffffff', fontSize: 17, fontWeight: 700,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: SANS,
                transition: 'border-color 0.12s, background 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#222'; e.currentTarget.style.borderColor = '#555' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.borderColor = '#333' }}
            >
              {currency === 'USD' ? '$' : '₪'}
            </button>
          </div>
        )}

        {/* Vertical separator */}
        <div style={{ width: 1, height: 44, background: '#1e1e1e', flexShrink: 0 }} />

        {/* Time + LIVE */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 2 }}>
            {pricesLoading ? 'Syncing…' : 'Just now'}
          </div>
          <LiveClock />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <span className="live-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#00ff87', display: 'inline-block' }} />
            <span style={{ fontFamily: MONO, fontSize: 10, color: '#00ff87', letterSpacing: '0.10em', fontWeight: 600 }}>
              LIVE
            </span>
          </div>
        </div>

      </div>
    </header>
  )
}
