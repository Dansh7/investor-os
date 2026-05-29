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

export function PortfolioPulse({
  totalValue, cashPct, todayPnL, todayPnLPct,
  criticalAlerts, warningAlerts, minCashPct, maxCashPct,
  loading, hasPrices, formatAmount,
}: Props) {
  const totalAlerts = criticalAlerts + warningAlerts
  const status = criticalAlerts > 0 ? 'off-plan' : warningAlerts > 0 ? 'partial' : 'on-plan'

  const STATUS_CFG = {
    'on-plan':  { label: 'בתכנית',       color: '#00DC82' },
    'partial':  { label: 'חלקי',         color: '#F5A623' },
    'off-plan': { label: 'מחוץ לתכנית', color: '#FF5A5A' },
  }[status]

  const riskLevel = criticalAlerts > 1 ? 'high' : criticalAlerts === 1 ? 'elevated' : warningAlerts >= 3 ? 'moderate' : 'low'

  const RISK_LABEL: Record<string, { label: string; color: string }> = {
    low:      { label: 'סיכון נמוך',   color: '#00DC82' },
    moderate: { label: 'סיכון בינוני', color: '#F5A623' },
    elevated: { label: 'סיכון מוגבר', color: '#F57A23' },
    high:     { label: 'סיכון גבוה',   color: '#FF5A5A' },
  }
  const riskCfg = RISK_LABEL[riskLevel]

  const cashHigh  = maxCashPct != null && cashPct > maxCashPct
  const cashLow   = minCashPct != null && cashPct < minCashPct
  const cashColor = cashHigh || cashLow ? '#F5A623' : '#7A7A7A'

  const hasDayPnL = hasPrices && todayPnL !== 0
  const pnlColor  = hasDayPnL ? (todayPnL >= 0 ? '#00DC82' : '#FF5A5A') : '#4A4A4A'

  const alertColor = criticalAlerts > 0 ? '#FF5A5A' : totalAlerts > 0 ? '#F5A623' : '#00DC82'
  const alertText  = criticalAlerts > 0 ? `${criticalAlerts} קריטי`
    : totalAlerts > 0 ? `${totalAlerts} סיגנלים`
    : 'ללא התראות'

  const DOT = (
    <span style={{ color: '#252525', fontSize: 22, fontWeight: 300, lineHeight: 1, userSelect: 'none' }}>·</span>
  )

  return (
    <div style={{ background: '#111111', borderRadius: 20, overflow: 'hidden', position: 'relative' }}>

      {/* Status accent line */}
      <div style={{ height: 3, background: STATUS_CFG.color, width: '100%' }} />

      {/* Hero area */}
      <div style={{ padding: '36px 40px 32px' }}>
        <p style={{
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.16em', color: '#333', marginBottom: 20,
        }}>
          שווי תיק
        </p>

        {/* Primary hero row: value + daily P&L */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 28, flexWrap: 'wrap', marginBottom: 28 }}>
          <p style={{
            fontSize: 72,
            fontWeight: 800,
            letterSpacing: '-0.04em',
            color: loading ? '#2A2A2A' : '#FFFFFF',
            lineHeight: 0.88,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {loading ? '—' : formatAmount(totalValue)}
          </p>

          {hasDayPnL ? (
            <div style={{ paddingBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                <span style={{
                  fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em',
                  color: pnlColor, fontVariantNumeric: 'tabular-nums',
                }}>
                  {todayPnL >= 0 ? '+' : ''}{formatAmount(todayPnL)}
                </span>
                <span style={{ fontSize: 15, fontWeight: 600, color: pnlColor, fontVariantNumeric: 'tabular-nums' }}>
                  {signedPct(todayPnLPct)}
                </span>
              </div>
              <p style={{ fontSize: 10, color: '#4A4A4A', marginTop: 5, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                היום
              </p>
            </div>
          ) : !hasPrices ? (
            <div style={{ paddingBottom: 12 }}>
              <p style={{ fontSize: 13, color: '#333' }}>מחירים בטעינה…</p>
            </div>
          ) : null}
        </div>

        {/* Status strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: STATUS_CFG.color, letterSpacing: '-0.01em' }}>
            {STATUS_CFG.label}
          </span>
          {DOT}
          <span style={{ fontSize: 13, fontWeight: 500, color: riskCfg.color }}>
            {riskCfg.label}
          </span>
          {DOT}
          <span style={{ fontSize: 13, fontWeight: 500, color: cashColor }}>
            מזומן {cashPct.toFixed(1)}%
          </span>
          {DOT}
          <span style={{ fontSize: 13, fontWeight: 500, color: alertColor }}>
            {alertText}
          </span>
        </div>
      </div>
    </div>
  )
}
