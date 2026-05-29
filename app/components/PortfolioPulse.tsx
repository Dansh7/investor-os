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

function Sep() {
  return (
    <div style={{ width: 1, height: 14, background: '#262626', margin: '0 18px', flexShrink: 0 }} />
  )
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
    low:      { label: 'סיכון נמוך',   color: '#5A5A5A' },
    moderate: { label: 'סיכון בינוני', color: '#F5A623' },
    elevated: { label: 'סיכון מוגבר', color: '#F57A23' },
    high:     { label: 'סיכון גבוה',   color: '#FF5A5A' },
  }
  const riskCfg = RISK_LABEL[riskLevel]

  const cashHigh  = maxCashPct != null && cashPct > maxCashPct
  const cashLow   = minCashPct != null && cashPct < minCashPct
  const cashColor = cashHigh || cashLow ? '#F5A623' : '#5A5A5A'

  const hasDayPnL = hasPrices && todayPnL !== 0
  const pnlColor  = hasDayPnL ? (todayPnL >= 0 ? '#00DC82' : '#FF5A5A') : '#3A3A3A'

  const alertColor = criticalAlerts > 0 ? '#FF5A5A' : totalAlerts > 0 ? '#F5A623' : '#5A5A5A'
  const alertText  = criticalAlerts > 0 ? `${criticalAlerts} קריטי`
    : totalAlerts > 0 ? `${totalAlerts} סיגנלים`
    : 'ללא התראות'

  return (
    <div style={{ background: '#0E0E0E', borderRadius: 16, overflow: 'hidden' }}>

      {/* Status accent — 3px top line, colour reflects plan status */}
      <div style={{ height: 3, background: STATUS_CFG.color, width: '100%' }} />

      <div style={{ padding: '40px 48px 36px' }}>

        {/* Label */}
        <p style={{
          fontSize: 11, fontWeight: 500, textTransform: 'uppercase',
          letterSpacing: '0.16em', color: '#424242', marginBottom: 26,
        }}>
          שווי תיק
        </p>

        {/* Hero row: portfolio value + today P&L */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 36, flexWrap: 'wrap', marginBottom: 36 }}>
          <p style={{
            fontSize: 72,
            fontWeight: 800,
            letterSpacing: '-0.05em',
            color: loading ? '#222' : '#FFFFFF',
            lineHeight: 0.88,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {loading ? '—' : formatAmount(totalValue)}
          </p>

          {hasDayPnL ? (
            <div style={{ paddingBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{
                  fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em',
                  color: pnlColor, fontVariantNumeric: 'tabular-nums',
                }}>
                  {todayPnL >= 0 ? '+' : ''}{formatAmount(todayPnL)}
                </span>
                <span style={{
                  fontSize: 15, fontWeight: 600, color: pnlColor,
                  fontVariantNumeric: 'tabular-nums', opacity: 0.80,
                }}>
                  {signedPct(todayPnLPct)}
                </span>
              </div>
              <p style={{
                fontSize: 11, color: '#424242', marginTop: 7,
                letterSpacing: '0.12em', textTransform: 'uppercase',
              }}>
                היום
              </p>
            </div>
          ) : !hasPrices ? (
            <div style={{ paddingBottom: 12 }}>
              <p style={{ fontSize: 13, color: '#2A2A2A' }}>מחירים בטעינה…</p>
            </div>
          ) : null}
        </div>

        {/* Status strip — vertical-line separators, no dots */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', rowGap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: STATUS_CFG.color, letterSpacing: '-0.01em' }}>
            {STATUS_CFG.label}
          </span>
          <Sep />
          <span style={{ fontSize: 13, fontWeight: 500, color: riskCfg.color }}>
            {riskCfg.label}
          </span>
          <Sep />
          <span style={{ fontSize: 13, fontWeight: 500, color: cashColor }}>
            מזומן {cashPct.toFixed(1)}%
          </span>
          <Sep />
          <span style={{ fontSize: 13, fontWeight: 500, color: alertColor }}>
            {alertText}
          </span>
        </div>

      </div>
    </div>
  )
}
