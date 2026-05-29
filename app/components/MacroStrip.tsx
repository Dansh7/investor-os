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
  if (v < 20) return '#7A7A7A'
  if (v < 30) return '#F5A623'
  return '#FF5A5A'
}

function deriveMood(fg: number | null, vix: number | null): { label: string; color: string } {
  const fgScore = fg != null
    ? (fg > 60 ? 2 : fg > 45 ? 1 : fg > 30 ? 0 : fg > 20 ? -1 : -2)
    : 0
  const vixScore = vix != null
    ? (vix < 13 ? 2 : vix < 18 ? 1 : vix < 24 ? 0 : vix < 32 ? -1 : -2)
    : 0
  const combined = fg != null && vix != null
    ? (fgScore + vixScore) / 2
    : fg != null ? fgScore : vixScore
  if (combined >= 1)  return { label: 'רגוע',       color: '#00DC82' }
  if (combined >= 0)  return { label: 'ניטרלי',     color: '#7A7A7A' }
  if (combined >= -1) return { label: 'מתוח',       color: '#F5A623' }
  return               { label: 'סיכון גבוה', color: '#FF5A5A' }
}

const DIVIDER = (
  <div style={{ width: 1, height: 28, background: '#1e1e1e', flexShrink: 0, margin: '0 24px' }} />
)

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
        background: '#0D0D0D',
        border: '1px solid #1a1a1a',
        borderRadius: 14,
        padding: '13px 24px',
        display: 'flex',
        alignItems: 'center',
        overflowX: 'auto',
        gap: 0,
      }}
    >
      {/* Section label */}
      <span style={{
        fontSize: 9,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.14em',
        color: '#2E2E2E',
        marginRight: 24,
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}>
        PULSE
      </span>

      {/* Fear & Greed */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4A4A4A', whiteSpace: 'nowrap' }}>
          F&G
        </span>
        {!macro.loaded ? (
          <span style={{ fontSize: 20, color: '#2A2A2A', fontWeight: 800 }}>—</span>
        ) : fg == null ? (
          <span style={{ fontSize: 13, color: '#4A4A4A' }}>לא זמין</span>
        ) : (
          <>
            <span style={{
              fontSize: 28, fontWeight: 800, color: fgColor(fg),
              fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', lineHeight: 1,
            }}>
              {fg}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: fgColor(fg), whiteSpace: 'nowrap' }}>
              {fgLabel(fg)}
            </span>
          </>
        )}
      </div>

      {DIVIDER}

      {/* VIX */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4A4A4A' }}>
          VIX
        </span>
        {vix == null ? (
          <span style={{ fontSize: 20, color: '#2A2A2A', fontWeight: 800 }}>—</span>
        ) : (
          <>
            <span style={{
              fontSize: 28, fontWeight: 800, color: vixColor(vix),
              fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', lineHeight: 1,
            }}>
              {vix.toFixed(1)}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: vixColor(vix), whiteSpace: 'nowrap' }}>
              {vixLabel(vix)}
            </span>
          </>
        )}
      </div>

      {DIVIDER}

      {/* Market Mood */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4A4A4A', whiteSpace: 'nowrap' }}>
          מצב שוק
        </span>
        <span style={{
          fontSize: 17, fontWeight: 700, color: mood.color,
          letterSpacing: '-0.01em', whiteSpace: 'nowrap',
        }}>
          {mood.label}
        </span>
      </div>

      {/* Source note */}
      <div style={{ marginLeft: 'auto', paddingLeft: 24, flexShrink: 0 }}>
        <span style={{ fontSize: 9, color: '#252525', whiteSpace: 'nowrap' }}>
          {fg != null && vix != null ? 'F&G + VIX' : vix != null ? 'VIX בלבד' : 'ממתין'}
          {fg != null ? ' · alternative.me' : ''}
        </span>
      </div>
    </div>
  )
}
