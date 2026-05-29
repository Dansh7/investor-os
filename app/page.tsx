'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

// Zone components (homepage)
import { PortfolioPulse } from './components/PortfolioPulse'
import { MacroStrip } from './components/MacroStrip'
import { AttentionQueue, type AlertRow, type NewsItem } from './components/AttentionQueue'
import { UpcomingTimeline, type TimelineEvent } from './components/UpcomingTimeline'

// Deep-dive components (expandable)
import { RiskMonitor } from './components/RiskMonitor'
import { DecisionQueue } from './components/DecisionQueue'
import { ConvictionMatrix } from './components/ConvictionMatrix'
import { NewsIntelligence } from './components/NewsIntelligence'
import { UpcomingEvents, type CalendarEvent } from './components/UpcomingEvents'
import { ThesisMonitor, type ThesisHolding } from './components/ThesisMonitor'
import { WatchlistPanel, type WatchlistItem } from './components/WatchlistPanel'
import { PolicyWidget, type PolicyRule, type PolicyObjective } from './components/PolicyWidget'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Holding {
  id: number
  ticker: string
  company_name: string
  shares: number
  avg_buy_price: number
  thesis?: string | null
  thesis_status?: string | null
  thesis_break_conditions?: string[] | null
  conviction_score?: number | null
  target_allocation_pct?: number | null
  max_allocation_pct?: number | null
}

interface PriceData {
  current_price: number | null
  change: number | null
  change_percent: number | null
}

const CASH = 38_000
const REFRESH_MS = 5 * 60 * 1000

const CATEGORIES = [
  { value: '', label: 'Select category' },
  { value: 'ai_tech', label: 'AI / Tech' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'energy', label: 'Energy' },
]

const EMPTY_FORM = {
  ticker: '', company_name: '', shares: '', avg_buy_price: '', category: '', thesis: '', conviction_score: '',
}

function usd(n: number, decimals = 0) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  }).format(n)
}

function pct(n: number) { return (n >= 0 ? '+' : '') + n.toFixed(2) + '%' }

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function XIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

// ─── Holdings table helpers ───────────────────────────────────────────────────

type SortCol = 'weight' | 'day' | 'pnl' | 'conviction'

type Tab = 'intelligence' | 'thesis' | 'risk' | 'events' | 'watchlist' | 'policy'

const TABS: { id: Tab; label: string }[] = [
  { id: 'intelligence',  label: 'אינטליגנציה' },
  { id: 'thesis',        label: 'תזה' },
  { id: 'risk',          label: 'סיכון והחלטות' },
  { id: 'events',        label: 'אירועים' },
  { id: 'watchlist',     label: 'מעקב' },
  { id: 'policy',        label: 'מדיניות' },
]

function timeAgo(d: Date): string {
  const m = Math.floor((Date.now() - d.getTime()) / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

const THESIS_DOT_COLOR: Record<string, string> = {
  intact:   '#00DC82',
  weakening:'#F5A623',
  at_risk:  '#F5A623',
  broken:   '#FF5A5A',
}

const TH_STYLE = { color: '#5A5A5A', fontSize: 10, fontWeight: 700 as const, letterSpacing: '0.12em', textTransform: 'uppercase' as const }

function ConvictionDots({ score }: { score: number | null | undefined }) {
  if (score == null) return <span style={{ color: '#333', fontSize: 12 }}>—</span>
  const fill = score >= 8 ? '#00DC82' : score >= 5 ? '#F5A623' : '#FF5A5A'
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', backgroundColor: i < score ? fill : '#252525', flexShrink: 0 }} />
      ))}
    </span>
  )
}

function ThesisPill({ status }: { status: string | null | undefined }) {
  const ts = (status ?? '').toLowerCase().replace(/\s+/g, '_')
  const cfg: Record<string, { label: string; bg: string; color: string }> = {
    intact:    { label: 'תקין',      bg: 'rgba(0,220,130,0.08)',  color: '#00DC82' },
    weakening: { label: 'נחלש',      bg: 'rgba(245,166,35,0.10)', color: '#F5A623' },
    at_risk:   { label: 'בסיכון',    bg: 'rgba(245,166,35,0.10)', color: '#F5A623' },
    broken:    { label: 'נשבר',      bg: 'rgba(255,90,90,0.10)',  color: '#FF5A5A' },
  }
  const { label, bg, color } = cfg[ts] ?? { label: 'ללא תזה', bg: 'rgba(100,100,100,0.07)', color: '#4A4A4A' }
  return (
    <span style={{ background: bg, color, fontSize: 10, padding: '3px 8px', borderRadius: 4, fontWeight: 600, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

function SortCaret({ active, dir }: { active: boolean; dir: 1 | -1 }) {
  return <span style={{ color: active ? '#7A7A7A' : '#2e2e2e', fontSize: 9, marginLeft: 2 }}>{active ? (dir === 1 ? '↑' : '↓') : '↕'}</span>
}

// ─────────────────────────────────────────────────────────────────────────────

const inputClass =
  'w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#444]'
const inputStyle = { background: '#1a1a1a', border: '1px solid #2e2e2e', color: '#FFFFFF' }
const labelClass = 'block text-xs font-medium mb-1'
const labelStyle = { color: '#666' }

export default function Dashboard() {
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [prices, setPrices] = useState<Record<string, PriceData>>({})
  const [pricesLoading, setPricesLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('intelligence')
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [holdingSort, setHoldingSort] = useState<{ col: SortCol; dir: 1 | -1 }>({ col: 'weight', dir: -1 })
  const [currency, setCurrency] = useState<'USD' | 'ILS'>('USD')

  const [alerts, setAlerts] = useState<AlertRow[]>([])
  const [newsItems, setNewsItems] = useState<NewsItem[]>([])
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [policy, setPolicy] = useState<{
    max_single_position_pct?: number | null
    max_sector_concentration_pct?: number | null
    min_cash_pct?: number | null
    max_cash_pct?: number | null
    rebalance_frequency?: string | null
  } | null>(null)
  const [rules, setRules] = useState<PolicyRule[]>([])
  const [objectives, setObjectives] = useState<PolicyObjective[]>([])
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])

  const holdingsRef = useRef<Holding[]>([])

  useEffect(() => {
    if (localStorage.getItem('currency') === 'ILS') setCurrency('ILS')
  }, [])

  const fetchPrices = useCallback(async (tickers: string[]) => {
    setPricesLoading(true)
    try {
      const all = [...new Set([...tickers, 'ILS=X', '^VIX'])]
      const res = await fetch(`/api/prices?tickers=${all.join(',')}`)
      if (!res.ok) throw new Error('failed')
      const data: (PriceData & { ticker: string })[] = await res.json()
      setLastSync(new Date())
      setPrices(prev => {
        const next = { ...prev }
        for (const item of data) next[item.ticker] = item
        return next
      })
    } catch { /* silent */ } finally { setPricesLoading(false) }
  }, [])

  const fetchHoldings = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('holdings')
      .select('id, ticker, company_name, shares, avg_buy_price, thesis, thesis_status, thesis_break_conditions, conviction_score, target_allocation_pct, max_allocation_pct')
      .eq('portfolio_id', 1)
    if (error) setFetchError(error.message)
    else { setFetchError(null); setHoldings(data ?? []); holdingsRef.current = data ?? [] }
    setLoading(false)
  }, [])

  const fetchIntelligence = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0]
    const [alertsRes, newsRes, eventsRes, policyRes, rulesRes, objectivesRes, watchlistRes] =
      await Promise.allSettled([
        supabase.from('alerts').select('*').eq('portfolio_id', 1).order('triggered_at', { ascending: false }).limit(50),
        supabase.from('news_items').select('id, ticker, headline, source, source_url, published_at, importance_score, portfolio_impact_score, urgency_score, confidence_score, thesis_impact, action_type, is_verified, scoring_reason, sentiment, summary, tags').order('published_at', { ascending: false }).limit(60),
        supabase.from('events').select('id, ticker, event_type, event_name, scheduled_at, notes').gte('scheduled_at', today).order('scheduled_at').limit(20),
        supabase.from('portfolio_policy').select('max_single_position_pct, max_sector_concentration_pct, min_cash_pct, max_cash_pct, rebalance_frequency').eq('portfolio_id', 1).single(),
        supabase.from('playbook_rules').select('*').eq('portfolio_id', 1).order('priority'),
        supabase.from('portfolio_objectives').select('*').eq('portfolio_id', 1).order('priority'),
        supabase.from('watchlist').select('*').eq('portfolio_id', 1).order('priority', { ascending: false }),
      ])
    if (alertsRes.status === 'fulfilled' && alertsRes.value.data) setAlerts(alertsRes.value.data)
    if (newsRes.status === 'fulfilled' && newsRes.value.data) setNewsItems(newsRes.value.data)
    if (eventsRes.status === 'fulfilled' && eventsRes.value.data) setEvents(eventsRes.value.data)
    if (policyRes.status === 'fulfilled' && policyRes.value.data) setPolicy(policyRes.value.data)
    if (rulesRes.status === 'fulfilled' && rulesRes.value.data) setRules(rulesRes.value.data)
    if (objectivesRes.status === 'fulfilled' && objectivesRes.value.data) setObjectives(objectivesRes.value.data)
    if (watchlistRes.status === 'fulfilled' && watchlistRes.value.data) setWatchlist(watchlistRes.value.data)
  }, [])

  useEffect(() => { fetchHoldings() }, [fetchHoldings])
  useEffect(() => { fetchIntelligence() }, [fetchIntelligence])

  const tickerKey = holdings.map(h => h.ticker).sort().join(',')
  useEffect(() => {
    fetchPrices(tickerKey ? tickerKey.split(',') : [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickerKey, fetchPrices])

  useEffect(() => {
    const interval = setInterval(() => {
      fetchPrices(holdingsRef.current.map(h => h.ticker))
    }, REFRESH_MS)
    return () => clearInterval(interval)
  }, [fetchPrices])

  useEffect(() => {
    if (!showModal) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowModal(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showModal])

  const ilsRate  = prices['ILS=X']?.current_price ?? null
  const vixValue = prices['^VIX']?.current_price ?? null

  function fmtAmount(usdAmount: number, decimals = 0) {
    if (currency === 'ILS' && ilsRate)
      return '₪' + new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(usdAmount * ilsRate)
    return usd(usdAmount, decimals)
  }

  function field(key: keyof typeof EMPTY_FORM, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function updateAlertStatus(id: string, status: string) {
    const res = await fetch(`/api/alerts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) setAlerts(prev => prev.map(a => a.id === id ? { ...a, alert_status: status } : a))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!form.ticker.trim() || !form.company_name.trim() || !form.shares || !form.avg_buy_price) {
      setFormError('Ticker, Company Name, Shares and Avg Buy Price are required')
      return
    }
    setSubmitting(true)
    const record: Record<string, unknown> = {
      ticker: form.ticker.trim().toUpperCase(),
      company_name: form.company_name.trim(),
      shares: parseFloat(form.shares),
      avg_buy_price: parseFloat(form.avg_buy_price),
      portfolio_id: 1,
      ...(form.category && { category: form.category }),
      ...(form.thesis.trim() && { thesis: form.thesis.trim() }),
      ...(form.conviction_score && { conviction_score: parseInt(form.conviction_score) }),
    }
    let { error } = await supabase.from('holdings').insert(record)
    if (error?.message.includes('does not exist')) {
      const { error: e2 } = await supabase.from('holdings').insert({
        ticker: record.ticker, company_name: record.company_name,
        shares: record.shares, avg_buy_price: record.avg_buy_price, portfolio_id: 1,
      })
      error = e2
    }
    setSubmitting(false)
    if (error) setFormError(error.message)
    else { setShowModal(false); fetchHoldings() }
  }

  async function handleDelete(id: number) {
    const { error } = await supabase.from('holdings').delete().eq('id', id)
    if (error) setFetchError(error.message)
    else { setConfirmDeleteId(null); fetchHoldings() }
  }

  // Derived calculations
  const rows = holdings.map(h => {
    const p = prices[h.ticker]
    const currentPrice = p?.current_price ?? null
    const pnlPct = currentPrice != null ? ((currentPrice - h.avg_buy_price) / h.avg_buy_price) * 100 : null
    const value = (currentPrice ?? h.avg_buy_price) * h.shares
    return { ...h, currentPrice, pnlPct, value, changePercent: p?.change_percent ?? null, changeAmount: p?.change ?? null }
  }).sort((a, b) => b.value - a.value)

  const invested = rows.reduce((s, r) => s + r.value, 0)
  const total = invested + CASH
  const cashPct = total > 0 ? (CASH / total) * 100 : 0
  const sortedRows = rows.map(r => ({ ...r, weight: total > 0 ? (r.value / total) * 100 : 0 }))
  const todayPnL = holdings.reduce((sum, h) => { const p = prices[h.ticker]; if (!p?.change) return sum; return sum + h.shares * p.change }, 0)
  const todayPnLPct = invested > 0 ? (todayPnL / (invested - todayPnL)) * 100 : 0
  const hasPrices = Object.keys(prices).length > 0

  const holdingsWithWeights = sortedRows.map(r => ({
    id: r.id, ticker: r.ticker, company_name: r.company_name, weight: r.weight,
    conviction_score: r.conviction_score, target_allocation_pct: r.target_allocation_pct,
    max_allocation_pct: r.max_allocation_pct, thesis: r.thesis,
    thesis_status: r.thesis_status, thesis_break_conditions: r.thesis_break_conditions,
  }))

  const activeAlerts = alerts.filter(a => a.alert_status === 'active')
  const criticalAlerts = activeAlerts.filter(a => a.priority >= 8).length
  const warningAlerts = activeAlerts.filter(a => a.priority >= 5 && a.priority < 8).length

  function handleHoldingSort(col: SortCol) {
    setHoldingSort(prev => ({ col, dir: (prev.col === col && prev.dir === -1 ? 1 : -1) as 1 | -1 }))
  }

  const tableRows = [...sortedRows].sort((a, b) => {
    const { col, dir } = holdingSort
    let va: number, vb: number
    if (col === 'day') { va = a.changePercent ?? 0; vb = b.changePercent ?? 0 }
    else if (col === 'pnl') { va = a.pnlPct ?? 0; vb = b.pnlPct ?? 0 }
    else if (col === 'conviction') { va = a.conviction_score ?? 0; vb = b.conviction_score ?? 0 }
    else { va = a.weight; vb = b.weight }
    return dir * (va - vb)
  })

  return (
    <div
      className="min-h-screen antialiased"
      style={{ background: '#090909', color: '#FFFFFF', fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-5 sm:px-8 py-4"
        style={{ background: '#111111', borderBottom: '1px solid #1e1e1e' }}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold tracking-tight text-white">Investor OS</span>
          {pricesLoading && (
            <span className="text-xs tabular-nums" style={{ color: '#555' }}>Updating…</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {lastSync && (
            <span className="text-xs hidden sm:block tabular-nums" style={{ color: '#444' }}>{timeAgo(lastSync)}</span>
          )}
          {ilsRate && (
            <span className="text-xs tabular-nums hidden sm:block" style={{ color: '#555' }}>
              ₪{ilsRate.toFixed(3)}/$
            </span>
          )}
          <div className="flex rounded-lg overflow-hidden text-xs font-medium" style={{ border: '1px solid #2e2e2e' }}>
            <button
              onClick={() => { setCurrency('USD'); localStorage.setItem('currency', 'USD') }}
              className="px-2.5 py-1.5 transition-colors"
              style={{ background: currency === 'USD' ? '#ffffff' : 'transparent', color: currency === 'USD' ? '#000000' : '#555' }}
            >$</button>
            <button
              onClick={() => { setCurrency('ILS'); localStorage.setItem('currency', 'ILS') }}
              className="px-2.5 py-1.5 transition-colors"
              style={{ background: currency === 'ILS' ? '#ffffff' : 'transparent', color: currency === 'ILS' ? '#000000' : '#555' }}
            >₪</button>
          </div>
        </div>
      </header>

      {/* ── Intelligence Strip — full width, above content ── */}
      <MacroStrip vix={vixValue} />

      {/* ── Main content ── */}
      <div className="max-w-[1320px] mx-auto px-6 sm:px-10 py-8" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* 1. Portfolio Hero */}
        <PortfolioPulse
          totalValue={total}
          cashPct={cashPct}
          todayPnL={todayPnL}
          todayPnLPct={todayPnLPct}
          criticalAlerts={criticalAlerts}
          warningAlerts={warningAlerts}
          minCashPct={policy?.min_cash_pct}
          maxCashPct={policy?.max_cash_pct}
          loading={loading}
          hasPrices={hasPrices}
          formatAmount={fmtAmount}
        />

        {/* 2. Holdings — full width primary workspace */}
          <div style={{ background: '#111111', border: '1px solid #1a1a1a', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ borderBottom: '1px solid #1a1a1a', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#5A5A5A' }}>אחזקות</span>
            <button
              onClick={() => { setForm(EMPTY_FORM); setFormError(null); setShowModal(true) }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#4A4A4A', fontSize: 12, cursor: 'pointer', transition: 'color 0.12s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#FFFFFF')}
              onMouseLeave={e => (e.currentTarget.style.color = '#4A4A4A')}
            >
              <PlusIcon /> הוסף
            </button>
          </div>

          {fetchError ? (
            <p className="px-5 py-10 text-center text-sm" style={{ color: '#FF5A5A' }}>{fetchError}</p>
          ) : loading ? (
            <p className="px-5 py-10 text-center text-sm" style={{ color: '#555' }}>Loading…</p>
          ) : tableRows.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm" style={{ color: '#555' }}>No holdings yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0C0C0C', borderBottom: '1px solid #1a1a1a' }}>
                    <th className="text-left px-7 py-4" style={TH_STYLE}>נייר</th>
                    <th className="text-left px-5 py-4 hidden sm:table-cell" style={TH_STYLE}>חברה</th>
                    <th className="text-right px-5 py-4 hidden md:table-cell" style={TH_STYLE}>מחיר</th>
                    <th className="text-right px-5 py-4 cursor-pointer select-none" style={TH_STYLE} onClick={() => handleHoldingSort('day')}>
                      <span className="inline-flex items-center justify-end">היום <SortCaret active={holdingSort.col === 'day'} dir={holdingSort.dir} /></span>
                    </th>
                    <th className="text-right px-5 py-4 cursor-pointer select-none hidden sm:table-cell" style={TH_STYLE} onClick={() => handleHoldingSort('pnl')}>
                      <span className="inline-flex items-center justify-end">P&L <SortCaret active={holdingSort.col === 'pnl'} dir={holdingSort.dir} /></span>
                    </th>
                    <th className="text-right px-5 py-4 hidden lg:table-cell" style={TH_STYLE}>רווח $</th>
                    <th className="text-right px-5 py-4 cursor-pointer select-none" style={TH_STYLE} onClick={() => handleHoldingSort('weight')}>
                      <span className="inline-flex items-center justify-end">משקל <SortCaret active={holdingSort.col === 'weight'} dir={holdingSort.dir} /></span>
                    </th>
                    <th className="text-right px-5 py-4 cursor-pointer select-none hidden lg:table-cell" style={TH_STYLE} onClick={() => handleHoldingSort('conviction')}>
                      <span className="inline-flex items-center justify-end">אמון <SortCaret active={holdingSort.col === 'conviction'} dir={holdingSort.dir} /></span>
                    </th>
                    <th className="text-left px-5 py-4 hidden xl:table-cell" style={TH_STYLE}>תזה</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((h, idx) => {
                    const dotColor = THESIS_DOT_COLOR[(h.thesis_status ?? '').toLowerCase().replace(/\s+/g, '_')] ?? '#2a2a2a'
                    const pnlDollar = h.currentPrice != null ? (h.currentPrice - h.avg_buy_price) * h.shares : null
                    const dailyDollar = h.changeAmount != null ? h.changeAmount * h.shares : null
                    const targetPct = h.target_allocation_pct ?? h.max_allocation_pct
                    const maxPct = h.max_allocation_pct
                    const barFill = maxPct && h.weight > maxPct ? '#FF5A5A'
                      : targetPct && h.weight > targetPct * 0.85 ? '#F5A623'
                      : '#00DC82'
                    const barWidth = targetPct ? Math.min(100, (h.weight / targetPct) * 100) : null
                    return (
                      <tr
                        key={h.id}
                        style={{
                          borderBottom: idx < tableRows.length - 1 ? '1px solid #141414' : 'none',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#131313')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td className="px-7 py-5">
                          <div className="flex items-center gap-3">
                            <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0, display: 'inline-block' }} />
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: '#FFFFFF', letterSpacing: '0.02em' }}>
                              {h.ticker}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-5 hidden sm:table-cell max-w-[180px]">
                          <span className="block truncate" style={{ color: '#9A9A9A', fontSize: 13 }}>{h.company_name}</span>
                        </td>
                        <td className="px-5 py-5 text-right hidden md:table-cell">
                          <span style={{ color: '#E0E0E0', fontSize: 14, fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                            {h.currentPrice != null ? fmtAmount(h.currentPrice, 2) : '—'}
                          </span>
                        </td>
                        <td className="px-5 py-5 text-right">
                          {h.changePercent != null ? (
                            <div className="flex flex-col items-end">
                              <span style={{ color: h.changePercent >= 0 ? '#00DC82' : '#FF5A5A', fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                                {h.changePercent >= 0 ? '+' : ''}{h.changePercent.toFixed(2)}%
                              </span>
                              {dailyDollar != null && (
                                <span style={{ color: dailyDollar >= 0 ? '#00804D' : '#8B2020', fontSize: 11, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
                                  {dailyDollar >= 0 ? '+' : ''}{fmtAmount(Math.abs(dailyDollar), 0)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#2E2E2E', fontSize: 14 }}>—</span>
                          )}
                        </td>
                        <td className="px-5 py-5 text-right hidden sm:table-cell">
                          {h.pnlPct != null ? (
                            <span style={{ color: h.pnlPct >= 0 ? '#00DC82' : '#FF5A5A', fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                              {h.pnlPct >= 0 ? '+' : ''}{h.pnlPct.toFixed(2)}%
                            </span>
                          ) : (
                            <span style={{ color: '#2E2E2E', fontSize: 14 }}>—</span>
                          )}
                        </td>
                        <td className="px-5 py-5 text-right hidden lg:table-cell">
                          {pnlDollar != null ? (
                            <span style={{ color: pnlDollar >= 0 ? '#00DC82' : '#FF5A5A', fontSize: 13, fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                              {(pnlDollar >= 0 ? '+' : '-') + fmtAmount(Math.abs(pnlDollar), 0)}
                            </span>
                          ) : (
                            <span style={{ color: '#2E2E2E', fontSize: 13 }}>—</span>
                          )}
                        </td>
                        <td className="px-5 py-5 text-right">
                          <div className="flex flex-col items-end gap-1.5">
                            <div className="flex items-baseline gap-1.5">
                              <span style={{ color: '#E0E0E0', fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                                {h.weight.toFixed(1)}%
                              </span>
                              {targetPct && (
                                <span style={{ color: '#444', fontSize: 11 }}>/ {targetPct}%</span>
                              )}
                            </div>
                            {barWidth != null && (
                              <div style={{ width: 52, height: 2, background: '#1e1e1e', borderRadius: 1, overflow: 'hidden' }}>
                                <div style={{ width: `${barWidth}%`, height: '100%', backgroundColor: barFill, borderRadius: 1 }} />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-5 hidden lg:table-cell">
                          <div className="flex justify-end">
                            <ConvictionDots score={h.conviction_score} />
                          </div>
                        </td>
                        <td className="px-5 py-5 hidden xl:table-cell">
                          <ThesisPill status={h.thesis_status} />
                        </td>
                        <td className="px-4 py-5">
                          {confirmDeleteId === h.id ? (
                            <span className="flex items-center justify-end gap-2" style={{ fontSize: 11 }}>
                              <button onClick={() => setConfirmDeleteId(null)} style={{ color: '#555' }} className="hover:text-white transition-colors">ביטול</button>
                              <button onClick={() => handleDelete(h.id)} style={{ color: '#FF5A5A', fontWeight: 500 }} className="hover:opacity-70 transition-opacity">מחק</button>
                            </span>
                          ) : (
                            <button onClick={() => setConfirmDeleteId(h.id)} style={{ color: '#252525' }} className="flex ml-auto hover:text-[#FF5A5A] transition-colors">
                              <XIcon size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          </div>

        {/* 3. Critical Today — full width feed below holdings */}
        <AttentionQueue alerts={alerts} newsItems={newsItems} />

        {/* 4. Tabs */}
        <div>
          <div
            className="flex overflow-x-auto"
            style={{ borderBottom: '1px solid #1e1e1e', marginBottom: 24 }}
          >
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="whitespace-nowrap flex-shrink-0 transition-colors"
                style={{
                  padding: '12px 18px',
                  fontSize: 12,
                  fontWeight: activeTab === tab.id ? 600 : 500,
                  letterSpacing: '0.02em',
                  color: activeTab === tab.id ? '#FFFFFF' : '#4A4A4A',
                  borderBottom: `2px solid ${activeTab === tab.id ? '#FFFFFF' : 'transparent'}`,
                  marginBottom: -1,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'intelligence' && (
            <NewsIntelligence items={newsItems} />
          )}
          {activeTab === 'thesis' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <ThesisMonitor holdings={holdingsWithWeights as ThesisHolding[]} newsItems={newsItems} />
              <ConvictionMatrix holdings={holdingsWithWeights} cashPct={cashPct} />
            </div>
          )}
          {activeTab === 'risk' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <RiskMonitor alerts={alerts} onStatusChange={updateAlertStatus} />
              <DecisionQueue holdings={holdingsWithWeights} alerts={alerts} />
            </div>
          )}
          {activeTab === 'events' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <UpcomingTimeline events={events} />
              <UpcomingEvents events={events as CalendarEvent[]} />
            </div>
          )}
          {activeTab === 'watchlist' && (
            <WatchlistPanel items={watchlist} />
          )}
          {activeTab === 'policy' && (
            <PolicyWidget policy={policy} rules={rules} objectives={objectives} />
          )}
        </div>

      </div>

      {/* Add Stock Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div className="w-full max-w-md rounded-2xl" style={{ background: '#111111', border: '1px solid #232323' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #232323' }}>
              <h3 className="text-sm font-semibold text-white">Add Stock</h3>
              <button onClick={() => setShowModal(false)} className="transition-colors hover:text-white" style={{ color: '#555' }}><XIcon size={16} /></button>
            </div>
            <form onSubmit={handleAdd} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} style={labelStyle}>Ticker *</label>
                  <input type="text" value={form.ticker} onChange={e => field('ticker', e.target.value)} placeholder="NVDA" autoFocus className={inputClass + ' font-mono uppercase'} style={inputStyle} />
                </div>
                <div>
                  <label className={labelClass} style={labelStyle}>Category</label>
                  <select value={form.category} onChange={e => field('category', e.target.value)} className={inputClass} style={inputStyle}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>Company Name *</label>
                <input type="text" value={form.company_name} onChange={e => field('company_name', e.target.value)} placeholder="NVIDIA Corporation" className={inputClass} style={inputStyle} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} style={labelStyle}>Shares *</label>
                  <input type="number" min="0" step="any" value={form.shares} onChange={e => field('shares', e.target.value)} placeholder="50" className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label className={labelClass} style={labelStyle}>Avg Buy Price *</label>
                  <input type="number" min="0" step="any" value={form.avg_buy_price} onChange={e => field('avg_buy_price', e.target.value)} placeholder="450.00" className={inputClass} style={inputStyle} />
                </div>
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>Conviction Score (1–10)</label>
                <input type="number" min="1" max="10" value={form.conviction_score} onChange={e => field('conviction_score', e.target.value)} placeholder="8" className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>Thesis</label>
                <textarea rows={3} value={form.thesis} onChange={e => field('thesis', e.target.value)} placeholder="Why are you investing in this stock?" className={inputClass + ' resize-none'} style={inputStyle} />
              </div>
              {formError && <p className="text-xs" style={{ color: '#FF5A5A' }}>{formError}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-sm transition-colors hover:text-white" style={{ color: '#555' }}>Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50" style={{ background: '#ffffff', color: '#000000' }}>
                  {submitting ? 'Saving…' : 'Add Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
