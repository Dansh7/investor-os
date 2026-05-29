'use client'

import { useEffect, useState } from 'react'
import React from 'react'

interface Props {
  vix?: number | null
}

interface MacroState {
  fearGreed: number | null
  loaded: boolean
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
  if (v <= 55) return '#7A7A7A'
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
  if (score >= 0)  return { label: 'זהיר',       color: '#8A8A8A' }
  if (score >= -1) return { label: 'לחוץ',       color: '#F5A623' }
  return            { label: 'סיכון גבוה', color: '#FF5A5A' }
}

// ─── Arc gauge SVG ────────────────────────────────────────────────────────────
// Semicircle, center at (30, 30), radius 26, viewBox 0 0 60 34.
// value 0 → left end (4,30), value 100 → right end (56,30).

function ArcGauge({ value, color }: { value: number; color: string }) {
  const cx = 30, cy = 30, r = 26, nLen = 19

  const pt = (v: number) => {
    const a = Math.PI * (1 - v / 100)
    return { x: +(cx + r * Math.cos(a)).toFixed(2), y: +(cy - r * Math.sin(a)).toFixed(2) }
  }

  const seg = (v1: number, v2: number) => {
    const s = pt(v1), e = pt(v2)
    return `M ${s.x} ${s.y} A ${r} ${r} 0 0 1 ${e.x} ${e.y}`
  }

  const na = Math.PI * (1 - Math.max(0, Math.min(100, value)) / 100)
  const tip = { x: +(cx + nLen * Math.cos(na)).toFixed(2), y: +(cy - nLen * Math.sin(na)).toFixed(2) }

  return (
    <svg
      width="60" height="34"
      viewBox="0 0 60 34"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {/* Track */}
      <path
        d={`M ${pt(0).x} ${pt(0).y} A ${r} ${r} 0 0 1 ${pt(100).x} ${pt(100).y}`}
        fill="none" stroke="#1C1C1C" strokeWidth="5" strokeLinecap="round"
      />
      {/* Zone fills */}
      <path d={seg(0, 25)}   fill="none" stroke="#FF5A5A" strokeWidth="5" opacity="0.55" />
      <path d={seg(25, 45)}  fill="none" stroke="#F5A623" strokeWidth="5" opacity="0.55" />
      <path d={seg(45, 55)}  fill="none" stroke="#555555" strokeWidth="5" opacity="0.40" />
      <path d={seg(55, 75)}  fill="none" stroke="#00DC82" strokeWidth="5" opacity="0.55" />
      <path d={seg(75, 100)} fill="none" stroke="#00DC82" strokeWidth="5" opacity="0.55" />
      {/* Needle */}
      <line
        x1={cx} y1={cy} x2={tip.x} y2={tip.y}
        stroke={color} strokeWidth="1.5" strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r="2.5" fill={color} />
    </svg>
  )
}

// ─── Divider ──────────────────────────────────────────────────────────────────

const DIV = (
  <div style={{ width: 1, height: 22, background: '#1A1A1A', margin: '0 28px', flexShrink: 0 }} />
)

// ─── MacroStrip ───────────────────────────────────────────────────────────────

export function MacroStrip({ vix }: Props) {
  const [macro, setMacro] = useState<MacroState>({ fearGreed: null, loaded: false })

  useEffect(() => {
    fetch('/api/macro')
      .then(r => r.json())
      .then(d => setMacro({ fearGreed: d.fearGreed?.value ?? null, loaded: true }))
      .catch(() => setMacro({ fearGreed: null, loaded: true }))
  }, [])

  const fg   = macro.fearGreed
  const mood = deriveMood(fg, vix ?? null)

  return (
    <div
      style={{
        background: '#0A0A0A',
        borderBottom: '1px solid #161616',
        display: 'flex',
        alignItems: 'center',
        height: 52,
        padding: '0 40px',
        gap: 0,
        overflowX: 'auto',
        flexShrink: 0,
      }}
    >
      {/* Identity */}
      <span style={{
        fontSize: 9, fontWeight: 800, textTransform: 'uppercase',
        letterSpacing: '0.20em', color: '#2A2A2A',
        marginRight: 28, flexShrink: 0, whiteSpace: 'nowrap',
      }}>
        PULSE
      </span>

      {/* Fear & Greed */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span style={{
          fontSize: 9, fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.10em', color: '#3A3A3A', whiteSpace: 'nowrap',
        }}>
          פחד ותאוות בצע
        </span>

        {!macro.loaded ? (
          <span style={{ fontSize: 20, color: '#252525', fontWeight: 700 }}>—</span>
        ) : fg == null ? (
          <span style={{ fontSize: 12, color: '#3A3A3A' }}>N/A</span>
        ) : (
          <>
            <ArcGauge value={fg} color={fgColor(fg)} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, gap: 3 }}>
              <span style={{
                fontSize: 22, fontWeight: 800, color: fgColor(fg),
                fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em',
              }}>
                {fg}
              </span>
              <span style={{ fontSize: 10, fontWeight: 600, color: fgColor(fg), whiteSpace: 'nowrap' }}>
                {fgLabel(fg)}
              </span>
            </div>
          </>
        )}
      </div>

      {DIV}

      {/* VIX */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span style={{
          fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.10em', color: '#3A3A3A',
        }}>
          VIX
        </span>
        {vix == null ? (
          <span style={{ fontSize: 20, color: '#252525', fontWeight: 700 }}>—</span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, gap: 3 }}>
            <span style={{
              fontSize: 22, fontWeight: 800, color: vixColor(vix),
              fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em',
            }}>
              {vix.toFixed(1)}
            </span>
            <span style={{ fontSize: 10, fontWeight: 600, color: vixColor(vix), whiteSpace: 'nowrap' }}>
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
          letterSpacing: '0.10em', color: '#3A3A3A', whiteSpace: 'nowrap',
        }}>
          מצב שוק
        </span>
        <span style={{
          fontSize: 16, fontWeight: 800, color: mood.color,
          letterSpacing: '-0.02em', whiteSpace: 'nowrap',
        }}>
          {mood.label}
        </span>
      </div>

      {/* Attribution — far right */}
      <div style={{ marginLeft: 'auto', paddingLeft: 32, flexShrink: 0 }}>
        <span style={{ fontSize: 9, color: '#1E1E1E', letterSpacing: '0.04em' }}>
          alternative.me
        </span>
      </div>
    </div>
  )
}
