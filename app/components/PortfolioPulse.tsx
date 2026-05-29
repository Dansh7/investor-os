'use client'

import React from 'react'

interface Props {
  totalValue: number
  cashPct: number
  todayPnL: number
  todayPnLPct: number
  criticalAlerts: number
  warningAlerts: number
  minCashPct?: number | null
  maxCashPct?: number | null
  loading: boolean
  hasPrices: boolean
  formatAmount: (n: number, decimals?: number) => string
}

function signedPct(n: number) {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'
}

const LABEL: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.13em',
  color: '#4A4A4A',
  marginBottom: 6,
}

export function PortfolioPulse({
  totalValue, cashPct, todayPnL, todayPnLPct,
  criticalAlerts, warningAlerts, minCashPct, maxCashPct,
  loading, hasPrices, formatAmount,
}: Props) {
  const totalAlerts = criticalAlerts + warningAlerts
  const status = criticalAlerts > 0 ? 'off-plan' : warningAlerts > 0 ? 'partial' : 'on-plan'

  const STATUS_CFG = {
    'on-plan':  { label: 'בתכנית',        color: '#00DC82', sub: 'אין בעיות פעילות הדורשות תשומת לב' },
    'partial':  { label: 'חלקי',          color: '#F5A623', sub: `${warningAlerts} סיגנל לבדיקה` },
    'off-plan': { label: 'מחוץ לתכנית',  color: '#FF5A5A', sub: `${criticalAlerts} בעיה קריטית דורשת פעולה` },
  }[status]

  const riskLevel = criticalAlerts > 1 ? 'high' : criticalAlerts === 1 ? 'elevated' : warningAlerts >= 3 ? 'moderate' : 'low'

  const RISK_CFG: Record<string, { label: string; bg: string; color: string }> = {
    low:      { label: 'סיכון נמוך',   bg: 'rgba(0,220,130,0.08)',  color: '#00DC82' },
    moderate: { label: 'סיכון בינוני', bg: 'rgba(245,166,35,0.10)', color: '#F5A623' },
    elevated: { label: 'סיכון מוגבר', bg: 'rgba(245,120,35,0.10)', color: '#F57A23' },
    high:     { label: 'סיכון גבוה',   bg: 'rgba(255,90,90,0.12)',  color: '#FF5A5A' },
  }
  const riskCfg = RISK_CFG[riskLevel]

  const cashHigh     = maxCashPct != null && cashPct > maxCashPct
  const cashLow      = minCashPct != null && cashPct < minCashPct
  const cashSub      = cashHigh ? 'מעל היעד' : cashLow ? 'מתחת למינימום' : 'בטווח'
  const cashSubColor = cashHigh || cashLow ? '#F5A623' : '#00DC82'
  const cashValColor = cashHigh || cashLow ? '#F5A623' : '#FFFFFF'

  const hasDayPnL = hasPrices && todayPnL !== 0
  const pnlColor  = hasDayPnL ? (todayPnL >= 0 ? '#00DC82' : '#FF5A5A') : '#FFFFFF'

  const alertSub      = criticalAlerts > 0 ? `${criticalAlerts} קריטי` : totalAlerts > 0 ? `${totalAlerts} פעיל` : 'הכל תקין'
  const alertSubColor = criticalAlerts > 0 ? '#FF5A5A' : totalAlerts > 0 ? '#F5A623' : '#00DC82'

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#111111', border: '1px solid #242424' }}>

      {/* Hero — portfolio value is the star */}
      <div className="px-7 pt-8 pb-7">
        <p style={LABEL}>מצב תיק</p>

        {/* Primary number + daily P&L */}
        <div className="flex items-end gap-8 flex-wrap" style={{ marginBottom: 20 }}>
          <p style={{
            fontSize: 44,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: '#FFFFFF',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {loading ? '—' : formatAmount(totalValue)}
          </p>

          {hasDayPnL ? (
            <div style={{ paddingBottom: 7 }}>
              <div className="flex items-baseline gap-2">
                <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em', color: pnlColor, fontVariantNumeric: 'tabular-nums' }}>
                  {todayPnL >= 0 ? '+' : ''}{formatAmount(todayPnL)}
                </span>
                <span style={{ fontSize: 13, fontWeight: 500, color: pnlColor, fontVariantNumeric: 'tabular-nums' }}>
                  {signedPct(todayPnLPct)}
                </span>
              </div>
              <p style={{ fontSize: 10, color: '#4A4A4A', marginTop: 4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>היום</p>
            </div>
          ) : !hasPrices ? (
            <div style={{ paddingBottom: 10 }}>
              <p style={{ fontSize: 12, color: '#4A4A4A' }}>מחירים בטעינה…</p>
            </div>
          ) : null}
        </div>

        {/* Status + Risk row */}
        <div className="flex items-center gap-3 flex-wrap">
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em', color: STATUS_CFG.color }}>
            {STATUS_CFG.label}
          </span>
          <span style={{ display: 'inline-block', width: 3, height: 3, borderRadius: '50%', background: '#333', flexShrink: 0 }} />
          <span style={{ background: riskCfg.bg, color: riskCfg.color, fontSize: 11, padding: '2px 9px', borderRadius: 5, fontWeight: 600, letterSpacing: '0.01em' }}>
            {riskCfg.label}
          </span>
          <span style={{ fontSize: 12, color: '#7A7A7A' }}>{STATUS_CFG.sub}</span>
        </div>
      </div>

      {/* Stats strip — 3 cells, no duplicate portfolio value */}
      <div className="grid grid-cols-3" style={{ borderTop: '1px solid #1a1a1a' }}>
        <div className="px-5 py-4" style={{ borderRight: '1px solid #1a1a1a' }}>
          <p style={LABEL}>מזומן</p>
          <p style={{ fontSize: 16, fontWeight: 600, color: cashValColor, fontVariantNumeric: 'tabular-nums' }}>
            {cashPct.toFixed(1)}%
          </p>
          <p style={{ fontSize: 11, color: cashSubColor, marginTop: 3 }}>{cashSub}</p>
        </div>

        <div className="px-5 py-4" style={{ borderRight: '1px solid #1a1a1a' }}>
          <p style={LABEL}>סיגנלים</p>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#FFFFFF', fontVariantNumeric: 'tabular-nums' }}>
            {totalAlerts}
          </p>
          <p style={{ fontSize: 11, color: alertSubColor, marginTop: 3 }}>{alertSub}</p>
        </div>

        <div className="px-5 py-4">
          <p style={LABEL}>רמת סיכון</p>
          <span style={{
            background: riskCfg.bg,
            color: riskCfg.color,
            fontSize: 12,
            padding: '3px 10px',
            borderRadius: 5,
            fontWeight: 600,
            display: 'inline-block',
            marginTop: 2,
          }}>
            {riskCfg.label}
          </span>
        </div>
      </div>
    </div>
  )
}
