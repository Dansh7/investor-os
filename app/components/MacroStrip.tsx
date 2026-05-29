'use client'

import { useEffect, useState } from 'react'

interface Props {
  vix?: number | null
}

interface MacroState {
  fearGreed: number | null
  loaded: boolean
}

const LABEL: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.13em',
  color: '#4A4A4A',
  marginBottom: 8,
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
  if (v <= 75) return '#00DC82'
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
  if (combined >= 1)   return { label: 'רגוע',        color: '#00DC82' }
  if (combined >= 0)   return { label: 'ניטרלי',      color: '#7A7A7A' }
  if (combined >= -1)  return { label: 'מתוח',        color: '#F5A623' }
  return                      { label: 'סיכון גבוה',  color: '#FF5A5A' }
}

function GaugeBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ width: 56, height: 3, background: '#1e1e1e', borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ width: `${Math.max(2, Math.min(100, value))}%`, height: '100%', backgroundColor: color, borderRadius: 2 }} />
    </div>
  )
}

import React from 'react'

export function MacroStrip({ vix }: Props) {
  const [macro, setMacro] = useState<MacroState>({ fearGreed: null, loaded: false })

  useEffect(() => {
    fetch('/api/macro')
      .then(r => r.json())
      .then(d => setMacro({ fearGreed: d.fearGreed?.value ?? null, loaded: true }))
      .catch(() => setMacro({ fearGreed: null, loaded: true }))
  }, [])

  const fg  = macro.fearGreed
  const mood = deriveMood(fg, vix ?? null)

  return (
    <div
      className="grid grid-cols-3 rounded-xl overflow-hidden"
      style={{ background: '#111111', border: '1px solid #242424' }}
    >
      {/* Fear & Greed */}
      <div className="px-5 py-4" style={{ borderRight: '1px solid #1a1a1a' }}>
        <p style={LABEL}>פחד ותאוות בצע</p>
        {!macro.loaded ? (
          <p style={{ fontSize: 13, color: '#4A4A4A' }}>—</p>
        ) : fg == null ? (
          <p style={{ fontSize: 12, color: '#4A4A4A' }}>לא זמין</p>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-1">
              <GaugeBar value={fg} color={fgColor(fg)} />
              <span style={{ fontSize: 18, fontWeight: 700, color: fgColor(fg), fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                {fg}
              </span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: fgColor(fg) }}>{fgLabel(fg)}</span>
          </div>
        )}
      </div>

      {/* VIX */}
      <div className="px-5 py-4" style={{ borderRight: '1px solid #1a1a1a' }}>
        <p style={LABEL}>VIX</p>
        {vix == null ? (
          <p style={{ fontSize: 12, color: '#4A4A4A' }}>בטעינה…</p>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-1">
              <GaugeBar value={Math.min(100, (vix / 50) * 100)} color={vixColor(vix)} />
              <span style={{ fontSize: 18, fontWeight: 700, color: vixColor(vix), fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                {vix.toFixed(1)}
              </span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: vixColor(vix) }}>{vixLabel(vix)}</span>
          </div>
        )}
      </div>

      {/* Market Mood */}
      <div className="px-5 py-4">
        <p style={LABEL}>מצב שוק</p>
        <div style={{ marginBottom: 4 }}>
          <span style={{
            fontSize: 16,
            fontWeight: 700,
            color: mood.color,
            letterSpacing: '-0.02em',
          }}>
            {mood.label}
          </span>
        </div>
        <p style={{ fontSize: 10, color: '#4A4A4A' }}>
          {fg != null && vix != null ? 'מבוסס F&G + VIX' : vix != null ? 'מבוסס VIX' : 'ממתין לנתונים'}
        </p>
      </div>
    </div>
  )
}
