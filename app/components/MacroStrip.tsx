'use client'

import { useEffect, useState } from 'react'
import React from 'react'

interface Props {
  vix?: number | null
}

interface MacroState {
  fearGreed: number | null
  loaded: boolean
  source: string | null
}

// ─── Label / color helpers ────────────────────────────────────────────────────

function fgLabel(v: number) {
  if (v <= 25) return 'פחד קיצוני'
  if (v <= 45) return 'פחד'
  if (v <= 55) return 'ניטרלי'
  if (v <= 75) return 'תאוות בצע'
  return 'תאוות בצע קיצונית'
}

function fgColor(v: number) {
  if (v <= 25) return '#FF5A5A'
  if (v <= 45) return '#F5A623'
  if (v <= 55) return '#8A8A8A'
  return '#00DC82'
}

function vixLabel(v: number) {
  if (v < 15) return 'רגוע'
  if (v < 20) return 'ניטרלי'
  if (v < 30) return 'מתוח'
  return 'לחץ גבוה'
}

function vixColor(v: number) {
  if (v < 15) return '#00DC82'
  if (v < 20) return '#8A8A8A'
  if (v < 30) return '#F5A623'
  return '#FF5A5A'
}

function deriveMood(fg: number | null, vix: number | null): { label: string; color: string } {
  const fgScore = fg != null ? (fg > 60 ? 2 : fg > 45 ? 1 : fg > 30 ? 0 : fg > 20 ? -1 : -2) : 0
  const vxScore = vix != null ? (vix < 13 ? 2 : vix < 18 ? 1 : vix < 24 ? 0 : vix < 32 ? -1 : -2) : 0
  const score = fg != null && vix != null ? (fgScore + vxScore) / 2 : fg != null ? fgScore : vxScore
  if (score >= 1)  return { label: 'רגוע',       color: '#00DC82' }
  if (score >= 0)  return { label: 'זהיר',        color: '#8A8A8A' }
  if (score >= -1) return { label: 'לחוץ',        color: '#F5A623' }
  return            { label: 'סיכון גבוה', color: '#FF5A5A' }
}

// ─── Arc Gauge ────────────────────────────────────────────────────────────────
// SVG 140×80, centre (70, 78), radius 68, arc left→top→right.
// Gradient arc (red → orange → neutral → green).
// Glowing needle + base circle.

function ArcGauge({ value, color }: { value: number; color: string }) {
  const cx = 70, cy = 78, r = 68, nLen = 54

  const pt = (v: number) => {
    const a = Math.PI * (1 - v / 100)
    return { x: +(cx + r * Math.cos(a)).toFixed(2), y: +(cy - r * Math.sin(a)).toFixed(2) }
  }

  const na  = Math.PI * (1 - Math.max(0, Math.min(100, value)) / 100)
  const tip = { x: +(cx + nLen * Math.cos(na)).toFixed(2), y: +(cy - nLen * Math.sin(na)).toFixed(2) }
  const arc = `M ${pt(0).x} ${pt(0).y} A ${r} ${r} 0 0 1 ${pt(100).x} ${pt(100).y}`

  return (
    <svg width="140" height="80" viewBox="0 0 140 80" style={{ display: 'block', flexShrink: 0 }}>
      <defs>
        <linearGradient id="fgGrad" gradientUnits="userSpaceOnUse" x1="2" y1="0" x2="138" y2="0">
          <stop offset="0%"   stopColor="#FF4444" />
          <stop offset="22%"  stopColor="#FF8C00" />
          <stop offset="48%"  stopColor="#555555" />
          <stop offset="72%"  stopColor="#00CC77" />
          <stop offset="100%" stopColor="#00A85A" />
        </linearGradient>
        <filter id="needleGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Dark background track */}
      <path d={arc} fill="none" stroke="#1C1C1C" strokeWidth="11" strokeLinecap="round" />

      {/* Gradient colour arc */}
      <path d={arc} fill="none" stroke="url(#fgGrad)" strokeWidth="11" strokeLinecap="round" opacity="0.82" />

      {/* Needle */}
      <line
        x1={cx} y1={cy} x2={tip.x} y2={tip.y}
        stroke={color} strokeWidth="2.5" strokeLinecap="round"
        filter="url(#needleGlow)"
      />
      {/* Base circle */}
      <circle cx={cx} cy={cy} r="5" fill={color} filter="url(#needleGlow)" />
      {/* Tip cap */}
      <circle cx={tip.x} cy={tip.y} r="2.5" fill={color} />
    </svg>
  )
}

// ─── Divider ──────────────────────────────────────────────────────────────────

const DIV = (
  <div style={{ width: 1, height: 36, background: '#1C1C1C', margin: '0 32px', flexShrink: 0 }} />
)

// ─── MacroStrip ───────────────────────────────────────────────────────────────

export function MacroStrip({ vix }: Props) {
  const [macro, setMacro] = useState<MacroState>({ fearGreed: null, loaded: false, source: null })

  useEffect(() => {
    fetch('/api/macro')
      .then(r => r.json())
      .then(d => setMacro({
        fearGreed: d.fearGreed?.value ?? null,
        loaded: true,
        source: d.source ?? null,
      }))
      .catch(() => setMacro({ fearGreed: null, loaded: true, source: null }))
  }, [])

  const fg   = macro.fearGreed
  const mood = deriveMood(fg, vix ?? null)

  return (
    <div
      style={{
        background: '#080808',
        borderBottom: '1px solid #1C1C1C',
        display: 'flex',
        alignItems: 'center',
        height: 92,
        padding: '0 40px',
        gap: 0,
        overflowX: 'auto',
        flexShrink: 0,
      }}
    >
      {/* Identity */}
      <span style={{
        fontSize: 9, fontWeight: 800, textTransform: 'uppercase',
        letterSpacing: '0.20em', color: '#242424',
        marginRight: 28, flexShrink: 0, whiteSpace: 'nowrap',
      }}>
        PULSE
      </span>

      {/* Fear & Greed */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <span style={{
          fontSize: 9, fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.10em', color: '#333', whiteSpace: 'nowrap',
        }}>
          פחד ותאוות בצע
        </span>

        {!macro.loaded ? (
          <div style={{ width: 140, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 22, color: '#222', fontWeight: 700 }}>—</span>
          </div>
        ) : fg == null ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 13, color: '#FF5A5A', fontWeight: 600 }}>לא זמין</span>
            <span style={{ fontSize: 10, color: '#2A2A2A' }}>CNN לא נגיש</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ArcGauge value={fg} color={fgColor(fg)} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, gap: 6 }}>
              <span style={{
                fontSize: 32, fontWeight: 800, color: fgColor(fg),
                fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.05em',
              }}>
                {Math.round(fg)}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: fgColor(fg), whiteSpace: 'nowrap' }}>
                {fgLabel(fg)}
              </span>
            </div>
          </div>
        )}
      </div>

      {DIV}

      {/* VIX */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <span style={{
          fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.10em', color: '#333',
        }}>
          VIX
        </span>
        {vix == null ? (
          <span style={{ fontSize: 32, color: '#222', fontWeight: 700 }}>—</span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, gap: 6 }}>
            <span style={{
              fontSize: 32, fontWeight: 800, color: vixColor(vix),
              fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.05em',
            }}>
              {vix.toFixed(1)}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: vixColor(vix), whiteSpace: 'nowrap' }}>
              {vixLabel(vix)}
            </span>
          </div>
        )}
      </div>

      {DIV}

      {/* Market Mood */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span style={{
          fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.10em', color: '#333', whiteSpace: 'nowrap',
        }}>
          מצב שוק
        </span>
        <span style={{
          fontSize: 24, fontWeight: 800, color: mood.color,
          letterSpacing: '-0.02em', whiteSpace: 'nowrap',
        }}>
          {mood.label}
        </span>
      </div>

      {/* Attribution — far right */}
      <div style={{ marginLeft: 'auto', paddingLeft: 32, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        {macro.source === 'CNN' && (
          <span style={{ fontSize: 9, color: '#CC0000', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            CNN
          </span>
        )}
        <span style={{ fontSize: 9, color: '#1A1A1A', letterSpacing: '0.04em' }}>
          fear &amp; greed
        </span>
      </div>
    </div>
  )
}
