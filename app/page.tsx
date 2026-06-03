'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'

// Zone components (homepage)
import { DashboardHeader } from './components/DashboardHeader'
import { DashboardSummary } from './components/DashboardSummary'
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
import { NewsIntelligencePanel, type IntelItem } from './components/NewsIntelligencePanel'
import { EarningsPanel, type EarningsCard } from './components/EarningsPanel'
import { AppNavbar, type MainView } from './components/AppNavbar'
import { AppSidebar } from './components/AppSidebar'
import { OverviewSection } from './components/OverviewSection'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Holding {
  id: string
  ticker: string
  company_name: string
  shares: number
  avg_buy_price: number
  category?: string | null
  thesis?: string | null
  thesis_status?: string | null
  thesis_break_conditions?: string[] | null
  conviction_score?: number | null
  target_allocation_pct?: number | null
  max_allocation_pct?: number | null
  last_earnings_date?: string | null
  next_earnings_date?: string | null
}

interface PriceData {
  current_price:       number | null
  change:              number | null
  change_percent:      number | null
  pre_change_percent:  number | null
  pre_change:          number | null
  post_change_percent: number | null
  post_change:         number | null
  market_state:        string | null
  has_extended:        boolean
  fifty_two_week_high: number | null
  ytd_pct:             number | null
}

const REFRESH_MS = 5 * 60 * 1000

const COMPANY_OVERRIDES: Record<string, string> = {
  IREN: 'IREN Ltd',
}

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

const FLAG_LABELS: Record<string, string> = {
  '🔥': 'Strong momentum',
  '🔻': 'Deep correction',
  '⚡': 'Upcoming event',
  '📰': 'Recent news',
  '⚠': 'Active alert',
}

function drawdownClass(athPct: number | null): 'mild' | 'significant' | 'deep' | null {
  if (athPct == null || athPct >= -10) return null
  if (athPct >= -25) return 'mild'
  if (athPct >= -40) return 'significant'
  return 'deep'
}

function attentionLevel(changePercent: number | null, athPct: number | null): 'HIGH' | 'MED' | 'LOW' {
  const dayAbs = Math.abs(changePercent ?? 0)
  if (dayAbs >= 4 || (athPct != null && athPct <= -40)) return 'HIGH'
  if (dayAbs >= 2 || (athPct != null && athPct <= -25)) return 'MED'
  return 'LOW'
}

function AttentionBadge({ level }: { level: 'HIGH' | 'MED' | 'LOW' }) {
  if (level === 'LOW') return null
  const cfg = level === 'HIGH'
    ? { label: 'HIGH', color: '#FF5A5A', bg: 'rgba(255,90,90,0.10)' }
    : { label: 'MED',  color: '#F5A623', bg: 'rgba(245,166,35,0.10)' }
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
      color: cfg.color, background: cfg.bg,
      padding: '2px 5px', borderRadius: 3, display: 'inline-block',
    }}>
      {cfg.label}
    </span>
  )
}

function dayPctStyle(p: number): React.CSSProperties {
  const abs = Math.abs(p)
  const pos = p >= 0
  if (abs >= 5) return {
    color: pos ? '#00FF8A' : '#FF3535',
    fontWeight: 700,
    background: pos ? 'rgba(0,255,138,0.11)' : 'rgba(255,53,53,0.11)',
    padding: '2px 7px',
    borderRadius: 5,
    textShadow: pos ? '0 0 12px rgba(0,255,138,0.28)' : '0 0 12px rgba(255,53,53,0.28)',
  }
  if (abs >= 3) return {
    color: pos ? '#00DC82' : '#FF5A5A',
    fontWeight: 700,
    background: pos ? 'rgba(0,220,130,0.08)' : 'rgba(255,90,90,0.08)',
    padding: '2px 7px',
    borderRadius: 5,
  }
  if (abs >= 1) return { color: pos ? '#00DC82' : '#FF5A5A', fontWeight: 600 }
  return { color: pos ? '#00966A' : '#BB3333', fontWeight: 500 }
}

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

type SortCol = 'weight' | 'day' | 'day_dollar' | 'pnl' | 'pnl_dollar' | 'value' | 'ath' | 'ytd' | 'conviction'

type Tab = 'intelligence' | 'earnings' | 'thesis' | 'risk' | 'events' | 'watchlist' | 'policy'

const TABS: { id: Tab; label: string }[] = [
  { id: 'intelligence',  label: 'ידיעות' },
  { id: 'earnings',      label: 'רווחים' },
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

const TH_STYLE = { color: '#5A5A5A', fontSize: 11, fontWeight: 700 as const, letterSpacing: '0.12em', textTransform: 'uppercase' as const }

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
  return <span style={{ color: active ? '#C0C0C0' : '#484848', fontSize: 9, marginLeft: 2 }}>{active ? (dir === 1 ? '↑' : '↓') : '↕'}</span>
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
  const [mainView, setMainView] = useState<MainView>('overview')
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [holdingSort, setHoldingSort] = useState<{ col: SortCol; dir: 1 | -1 }>({ col: 'weight', dir: -1 })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState({ qty: '', avgCost: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [intelItems, setIntelItems] = useState<IntelItem[]>([])
  const [intelLoading, setIntelLoading] = useState(false)
  const [earningsCards, setEarningsCards] = useState<EarningsCard[]>([])
  const [earningsLoading, setEarningsLoading] = useState(false)
  const earningsFetchedRef = useRef(false)
  const [currency, setCurrency] = useState<'USD' | 'ILS'>('USD')
  const [cash, setCash] = useState(38_000)
  const [editingCash, setEditingCash] = useState(false)
  const [cashDraft, setCashDraft] = useState('')

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

  const holdingsRef          = useRef<Holding[]>([])
  const moverTriggeredRef    = useRef(false)

  useEffect(() => {
    if (localStorage.getItem('currency') === 'ILS') setCurrency('ILS')
    const storedCash = localStorage.getItem('portfolio_cash')
    if (storedCash) {
      const val = parseFloat(storedCash)
      if (!isNaN(val) && val >= 0) setCash(Math.round(val))
    }
  }, [])

  const fetchPrices = useCallback(async (tickers: string[]) => {
    setPricesLoading(true)
    try {
      const all = [...new Set([...tickers, 'ILS=X', '^VIX', '^IXIC'])]
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
      .select('id, ticker, company_name, shares, avg_buy_price, category, thesis, thesis_status, thesis_break_conditions, conviction_score, target_allocation_pct, max_allocation_pct, last_earnings_date, next_earnings_date')
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

  const fetchNewsIntel = useCallback(async (morning = false, changes?: Record<string, number>) => {
    setIntelLoading(true)
    try {
      const params = new URLSearchParams()
      if (morning) params.set('morning', '1')
      if (changes && Object.keys(changes).length > 0) {
        params.set('changes', Object.entries(changes).map(([t, p]) => `${t}:${p.toFixed(2)}`).join(','))
      }
      const qs  = params.toString()
      const res = await fetch(`/api/news/all${qs ? `?${qs}` : ''}`)
      if (res.ok) setIntelItems(await res.json())
    } catch { /* silent */ } finally { setIntelLoading(false) }
  }, [])

  // Earnings: fetch for holdings that had earnings in the last 90 days
  // "Reported" = past earnings event exists; if only future events → skip
  const fetchEarningsData = useCallback(async (force = false) => {
    if (!force && earningsFetchedRef.current) return
    earningsFetchedRef.current = true
    setEarningsLoading(true)

    const now   = Date.now()
    const ago90 = now - 90 * 86_400_000
    const in90  = now + 90 * 86_400_000
    const eligible = holdings.filter(h => {
      // last_earnings_date within last 90 days
      if (h.last_earnings_date) {
        const t = new Date(h.last_earnings_date).getTime()
        if (t > ago90 && t <= now) return true
      }
      // next_earnings_date within next 90 days
      if (h.next_earnings_date) {
        const t = new Date(h.next_earnings_date).getTime()
        if (t > now && t < in90) return true
      }
      return false
    })

    if (eligible.length === 0) {
      setEarningsLoading(false)
      return
    }

    // Seed cards with loading placeholders
    setEarningsCards(eligible.map(h => ({
      ticker: h.ticker, company_name: h.company_name,
      quarter: '', date: '',
      revenue: { actual: null, estimate: null, beat: null },
      eps:     { actual: null, estimate: null, beat: null },
      gross_margin_pct: null, stock_reaction_pct: null,
      guidance_next_quarter: null,
      thesis_impact: 'neutral' as const,
      hebrew_summary: '', hebrew_call_highlights: [],
      sources: [],
      loading: true,
    })))

    const results = await Promise.allSettled(
      eligible.map(async h => {
        const res = await fetch(`/api/earnings/${h.ticker}?company=${encodeURIComponent(h.company_name)}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return { ...(await res.json()) as EarningsCard, ticker: h.ticker, company_name: h.company_name }
      })
    )

    setEarningsCards(results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value
      return {
        ticker: eligible[i].ticker, company_name: eligible[i].company_name,
        quarter: '', date: '',
        revenue: { actual: null, estimate: null, beat: null },
        eps:     { actual: null, estimate: null, beat: null },
        gross_margin_pct: null, stock_reaction_pct: null,
        guidance_next_quarter: null,
        thesis_impact: 'neutral' as const,
        hebrew_summary: '', hebrew_call_highlights: [],
        sources: [],
        error: String(r.reason),
      }
    }))
    setEarningsLoading(false)
  }, [holdings, events])

  // Morning auto-run: first page load of the day triggers the intelligence pipeline
  useEffect(() => {
    const key = 'last_intel_run'
    const today = new Date().toISOString().split('T')[0]
    const last  = typeof window !== 'undefined' ? localStorage.getItem(key) : null
    if (last !== today) {
      if (typeof window !== 'undefined') localStorage.setItem(key, today)
      fetchNewsIntel(true)
    }
  }, [fetchNewsIntel])

  // Lazy-load earnings when user opens the tab
  useEffect(() => {
    if (activeTab === 'earnings' && holdings.length > 0) {
      fetchEarningsData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Mover auto-trigger: after prices load, refresh intel for any ticker that moved > 2%
  // Only fires once per session; skips if morning scan already ran this load
  useEffect(() => {
    if (moverTriggeredRef.current) return
    if (Object.keys(prices).length === 0 || holdings.length === 0) return

    const movers: Record<string, number> = {}
    for (const h of holdings) {
      const cp = prices[h.ticker]?.change_percent
      if (cp != null && Math.abs(cp) > 2) movers[h.ticker] = cp
    }
    if (Object.keys(movers).length === 0) return

    // Only trigger if the morning scan for today has already completed
    const today = new Date().toISOString().split('T')[0]
    const lastRun = typeof window !== 'undefined' ? localStorage.getItem('last_intel_run') : null
    if (lastRun !== today) return  // morning scan hasn't fired yet — it will cover movers

    moverTriggeredRef.current = true
    fetchNewsIntel(false, movers)
  }, [prices, holdings, fetchNewsIntel])

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

  const ilsRate          = prices['ILS=X']?.current_price    ?? null
  const ilsChangePercent = prices['ILS=X']?.change_percent   ?? null
  const vixValue         = prices['^VIX']?.current_price     ?? null
  const vixChange        = prices['^VIX']?.change            ?? null
  const vixChangePct     = prices['^VIX']?.change_percent    ?? null
  const costBasis        = holdings.reduce((s, h) => s + h.shares * h.avg_buy_price, 0)

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

  async function handleDelete(id: string) {
    const { error } = await supabase.from('holdings').delete().eq('id', id)
    if (error) setFetchError(error.message)
    else { setConfirmDeleteId(null); fetchHoldings() }
  }

  function handleSaveCash() {
    const val = parseFloat(cashDraft.replace(/[$,\s]/g, ''))
    if (isNaN(val) || val < 0) return
    const rounded = Math.round(val)
    setCash(rounded)
    localStorage.setItem('portfolio_cash', String(rounded))
    setEditingCash(false)
    setCashDraft('')
  }

  async function handleSaveEdit(id: string) {
    const qty  = parseFloat(editDraft.qty)
    const cost = parseFloat(editDraft.avgCost)
    if (isNaN(qty) || isNaN(cost) || qty <= 0 || cost <= 0) {
      setEditError('Enter valid qty and cost (must be > 0)')
      return
    }
    setEditSaving(true)
    setEditError(null)
    try {
      const res = await fetch(`/api/holdings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shares: qty, avg_buy_price: cost }),
      })
      const json = await res.json()
      if (!res.ok) {
        setEditError(json.error ?? 'Save failed')
      } else {
        setEditingId(null)
        setEditError(null)
        fetchHoldings()
      }
    } catch (err) {
      setEditError('Network error')
      console.error('[handleSaveEdit]', err)
    } finally {
      setEditSaving(false)
    }
  }

  // Derived calculations
  const rows = holdings.map(h => {
    const p = prices[h.ticker]
    const currentPrice    = p?.current_price ?? null
    const pnlPct          = currentPrice != null ? ((currentPrice - h.avg_buy_price) / h.avg_buy_price) * 100 : null
    const pnlDollar       = currentPrice != null ? (currentPrice - h.avg_buy_price) * h.shares : null
    const value           = (currentPrice ?? h.avg_buy_price) * h.shares
    const dailyDollar     = p?.change != null ? p.change * h.shares : null
    const ath52           = p?.fifty_two_week_high ?? null
    const athPct          = currentPrice != null && ath52 != null && ath52 > 0
                            ? ((currentPrice - ath52) / ath52) * 100 : null
    return {
      ...h, currentPrice, pnlPct, pnlDollar, value, dailyDollar, athPct,
      changePercent:       p?.change_percent      ?? null,
      changeAmount:        p?.change              ?? null,
      preChangePercent:    p?.pre_change_percent  ?? null,
      postChangePercent:   p?.post_change_percent ?? null,
      marketState:         p?.market_state        ?? null,
      ytdPct:              p?.ytd_pct             ?? null,
    }
  }).sort((a, b) => b.value - a.value)

  const invested = rows.reduce((s, r) => s + r.value, 0)
  const total = invested + cash
  const cashPct = total > 0 ? (cash / total) * 100 : 0
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

  const SECTOR_META: Record<string, { label: string; color: string }> = {
    ai_tech: { label: 'AI / Tech', color: '#3b82f6' },
    crypto:  { label: 'Crypto',    color: '#f59e0b' },
    energy:  { label: 'Energy',    color: '#22c55e' },
  }
  const catWeights: Record<string, number> = {}
  for (const r of sortedRows) {
    const cat = r.category || 'other'
    catWeights[cat] = (catWeights[cat] || 0) + r.weight
  }
  const exposureData = [
    { label: 'Cash', pct: cashPct, color: '#ffaa00' },
    ...Object.entries(catWeights)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, pct]) => ({
        label: SECTOR_META[cat]?.label ?? 'Other',
        pct,
        color: SECTOR_META[cat]?.color ?? '#666666',
      })),
  ]

  const tickerFlags = useMemo(() => {
    const map: Record<string, string[]> = {}
    const now = Date.now()
    const dayAgo = now - 24 * 60 * 60 * 1000
    const weekAhead = now + 7 * 24 * 60 * 60 * 1000
    for (const item of newsItems) {
      const t = item.ticker?.toUpperCase()
      if (!t || !item.published_at) continue
      if (new Date(item.published_at).getTime() > dayAgo && (item.importance_score ?? 0) >= 7) {
        const arr = (map[t] ??= [])
        if (!arr.includes('📰')) arr.push('📰')
      }
    }
    for (const ev of events) {
      const t = ev.ticker?.toUpperCase()
      if (!t) continue
      const ts = new Date(ev.scheduled_at).getTime()
      if (ts > now && ts < weekAhead) {
        const arr = (map[t] ??= [])
        if (!arr.includes('⚡')) arr.push('⚡')
      }
    }
    for (const al of alerts) {
      const t = al.ticker?.toUpperCase()
      if (!t || al.alert_status !== 'active' || al.priority < 7) continue
      const arr = (map[t] ??= [])
      if (!arr.includes('⚠')) arr.push('⚠')
    }
    return map
  }, [newsItems, events, alerts])

  const activeAlerts = alerts.filter(a => a.alert_status === 'active')
  const criticalAlerts = activeAlerts.filter(a => a.priority >= 8).length
  const warningAlerts = activeAlerts.filter(a => a.priority >= 5 && a.priority < 8).length

  function handleHoldingSort(col: SortCol) {
    setHoldingSort(prev => ({ col, dir: (prev.col === col && prev.dir === -1 ? 1 : -1) as 1 | -1 }))
  }

  const tableRows = [...sortedRows].sort((a, b) => {
    const { col, dir } = holdingSort
    let va: number, vb: number
    if      (col === 'day')       { va = a.changePercent ?? 0;  vb = b.changePercent ?? 0 }
    else if (col === 'day_dollar'){ va = a.dailyDollar   ?? 0;  vb = b.dailyDollar   ?? 0 }
    else if (col === 'pnl')       { va = a.pnlPct        ?? 0;  vb = b.pnlPct        ?? 0 }
    else if (col === 'pnl_dollar'){ va = a.pnlDollar     ?? 0;  vb = b.pnlDollar     ?? 0 }
    else if (col === 'value')     { va = a.value;                vb = b.value }
    else if (col === 'ath')       { va = a.athPct        ?? 0;  vb = b.athPct        ?? 0 }
    else if (col === 'ytd')       { va = a.ytdPct        ?? 0;  vb = b.ytdPct        ?? 0 }
    else if (col === 'conviction'){ va = a.conviction_score ?? 0; vb = b.conviction_score ?? 0 }
    else                          { va = a.weight;               vb = b.weight }
    return dir * (va - vb)
  })

  // Sync activeTab when navigating to a tab view from sidebar/navbar
  useEffect(() => {
    const tabViews: Tab[] = ['intelligence', 'earnings', 'thesis', 'risk', 'events', 'watchlist', 'policy']
    if (tabViews.includes(mainView as Tab)) setActiveTab(mainView as Tab)
  }, [mainView])

  const handleSetMainView = (v: MainView) => {
    setMainView(v)
    if (v === 'earnings' && holdings.length > 0) fetchEarningsData()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#0a0a0f', color: '#FFFFFF', fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}>

      {/* ── Top Navbar ── */}
      <AppNavbar mainView={mainView} setMainView={handleSetMainView} />

      {/* ── Body: sidebar + main ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <AppSidebar mainView={mainView} setMainView={handleSetMainView} nasdaq={prices['^IXIC'] as { current_price: number | null; change_percent: number | null; change: number | null } | undefined} />

        <main style={{ flex: 1, overflowY: 'auto', background: '#0a0a0f' }}>

          {/* ── Overview section (top cards + AI row) ── */}
          {mainView === 'overview' && (
            <OverviewSection
              total={total} invested={invested} cash={cash} cashPct={cashPct}
              todayPnL={todayPnL} todayPnLPct={todayPnLPct} holdingsCount={holdings.length}
              exposureData={exposureData} vixValue={vixValue} vixChangePct={vixChangePct}
              intelItems={intelItems} sortedRows={sortedRows} newsItems={newsItems}
              fmtAmount={fmtAmount}
            />
          )}

          {/* ── Content area ── */}
          <div style={{ padding: mainView === 'overview' ? '0 28px 32px' : '28px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Holdings table — shown in overview and holdings view */}
        {(mainView === 'overview' || mainView === 'holdings') && (
        <div style={{ background: '#111118', border: '1px solid #1a1a28', borderRadius: 16, overflow: 'hidden' }}>

          {/* Table header bar */}
          <div style={{ borderBottom: '1px solid #1C1C1C', padding: '16px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 17, fontWeight: 600, color: '#E8E8E8', letterSpacing: '-0.01em' }}>Portfolio</span>
              <span style={{ fontSize: 13, color: '#666', fontWeight: 500 }}>{tableRows.length} positions</span>
            </div>
            <button
              onClick={() => { setForm(EMPTY_FORM); setFormError(null); setShowModal(true) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                color: '#909090', fontSize: 13, cursor: 'pointer',
                background: '#161616', border: '1px solid #363636',
                padding: '7px 16px', borderRadius: 8, transition: 'color 0.12s, border-color 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#555' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#909090'; e.currentTarget.style.borderColor = '#363636' }}
            >
              <PlusIcon /> Add
            </button>
          </div>

          {fetchError ? (
            <p className="px-5 py-10 text-center text-sm" style={{ color: '#FF5A5A' }}>{fetchError}</p>
          ) : loading ? (
            <p className="px-5 py-10 text-center text-sm" style={{ color: '#555' }}>Loading…</p>
          ) : tableRows.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm" style={{ color: '#555' }}>No positions yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 1540 }}>
                <colgroup>
                  <col style={{ width: 118 }} />
                  <col style={{ width: 210 }} />
                  <col style={{ width: 72 }} />
                  <col style={{ width: 102 }} />
                  <col style={{ width: 108 }} />
                  <col style={{ width: 118 }} />
                  <col style={{ width: 90 }} />
                  <col style={{ width: 108 }} />
                  <col style={{ width: 90 }} />
                  <col style={{ width: 112 }} />
                  <col style={{ width: 88 }} />
                  <col style={{ width: 96 }} />
                  <col style={{ width: 84 }} />
                  <col style={{ width: 96 }} />
                  <col style={{ width: 86 }} />
                </colgroup>
                <thead>
                  <tr style={{ background: '#0A0A0A', borderBottom: '1px solid #1C1C1C' }}>
                    {/* Ticker */}
                    <th className="text-left" style={{ ...TH_STYLE, padding: '10px 7px 10px 16px', color: '#E5E5E5', fontSize: 15, fontWeight: 600 }}>Ticker</th>
                    {/* Company */}
                    <th className="text-left" style={{ ...TH_STYLE, padding: '10px 7px', color: '#E5E5E5', fontSize: 15, fontWeight: 600 }}>Company</th>
                    {/* Qty */}
                    <th className="text-right" style={{ ...TH_STYLE, padding: '10px 7px', color: '#E5E5E5', fontSize: 15, fontWeight: 600 }}>Qty</th>
                    {/* Avg Cost */}
                    <th className="text-right" style={{ ...TH_STYLE, padding: '10px 7px', color: '#E5E5E5', fontSize: 15, fontWeight: 600 }}>Avg Cost</th>
                    {/* Price */}
                    <th className="text-right" style={{ ...TH_STYLE, padding: '10px 7px', color: '#E5E5E5', fontSize: 15, fontWeight: 600 }}>Price</th>
                    {/* Value */}
                    <th
                      className="text-right cursor-pointer select-none"
                      style={{ ...TH_STYLE, padding: '10px 7px', color: holdingSort.col === 'value' ? '#FFFFFF' : '#E5E5E5', fontSize: 15, fontWeight: 600 }}
                      onClick={() => handleHoldingSort('value')}
                    >
                      Value <SortCaret active={holdingSort.col === 'value'} dir={holdingSort.dir} />
                    </th>
                    {/* Day % */}
                    <th
                      className="text-right cursor-pointer select-none"
                      style={{ ...TH_STYLE, padding: '10px 7px', color: holdingSort.col === 'day' ? '#FFFFFF' : '#E5E5E5', fontSize: 15, fontWeight: 600 }}
                      onClick={() => handleHoldingSort('day')}
                    >
                      Day% <SortCaret active={holdingSort.col === 'day'} dir={holdingSort.dir} />
                    </th>
                    {/* Day $ */}
                    <th
                      className="text-right cursor-pointer select-none"
                      style={{ ...TH_STYLE, padding: '10px 7px', color: holdingSort.col === 'day_dollar' ? '#FFFFFF' : '#E5E5E5', fontSize: 15, fontWeight: 600 }}
                      onClick={() => handleHoldingSort('day_dollar')}
                    >
                      Day$ <SortCaret active={holdingSort.col === 'day_dollar'} dir={holdingSort.dir} />
                    </th>
                    {/* P&L % */}
                    <th
                      className="text-right cursor-pointer select-none"
                      style={{ ...TH_STYLE, padding: '10px 7px', color: holdingSort.col === 'pnl' ? '#FFFFFF' : '#E5E5E5', fontSize: 15, fontWeight: 600 }}
                      onClick={() => handleHoldingSort('pnl')}
                    >
                      P&L% <SortCaret active={holdingSort.col === 'pnl'} dir={holdingSort.dir} />
                    </th>
                    {/* P&L $ */}
                    <th
                      className="text-right cursor-pointer select-none"
                      style={{ ...TH_STYLE, padding: '10px 7px', color: holdingSort.col === 'pnl_dollar' ? '#FFFFFF' : '#E5E5E5', fontSize: 15, fontWeight: 600 }}
                      onClick={() => handleHoldingSort('pnl_dollar')}
                    >
                      P&L$ <SortCaret active={holdingSort.col === 'pnl_dollar'} dir={holdingSort.dir} />
                    </th>
                    {/* YTD */}
                    <th
                      className="text-right cursor-pointer select-none"
                      style={{ ...TH_STYLE, padding: '10px 7px', color: holdingSort.col === 'ytd' ? '#FFFFFF' : '#E5E5E5', fontSize: 15, fontWeight: 600 }}
                      onClick={() => handleHoldingSort('ytd')}
                    >
                      YTD% <SortCaret active={holdingSort.col === 'ytd'} dir={holdingSort.dir} />
                    </th>
                    {/* ATH */}
                    <th
                      className="text-right cursor-pointer select-none"
                      style={{ ...TH_STYLE, padding: '10px 7px', color: holdingSort.col === 'ath' ? '#FFFFFF' : '#E5E5E5', fontSize: 15, fontWeight: 600 }}
                      onClick={() => handleHoldingSort('ath')}
                    >
                      vs ATH <SortCaret active={holdingSort.col === 'ath'} dir={holdingSort.dir} />
                    </th>
                    {/* Weight */}
                    <th
                      className="text-right cursor-pointer select-none"
                      style={{ ...TH_STYLE, padding: '10px 7px', color: holdingSort.col === 'weight' ? '#FFFFFF' : '#E5E5E5', fontSize: 15, fontWeight: 600 }}
                      onClick={() => handleHoldingSort('weight')}
                    >
                      Wt% <SortCaret active={holdingSort.col === 'weight'} dir={holdingSort.dir} />
                    </th>
                    {/* Status */}
                    <th className="text-left" style={{ ...TH_STYLE, padding: '10px 7px', color: '#E5E5E5', fontSize: 15, fontWeight: 600 }}>Status</th>
                    {/* Actions */}
                    <th style={{ width: 80 }} />
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((h, idx) => {
                    const dotColor  = THESIS_DOT_COLOR[(h.thesis_status ?? '').toLowerCase().replace(/\s+/g, '_')] ?? '#2a2a2a'
                    const isEditing = editingId === h.id
                    const athWarning = h.athPct != null && h.athPct <= -30

                    const rowFlags: string[] = []
                    if ((h.changePercent ?? 0) >= 4) rowFlags.push('🔥')
                    else if ((h.changePercent ?? 0) <= -4 || (h.athPct != null && h.athPct <= -30)) rowFlags.push('🔻')
                    for (const f of tickerFlags[h.ticker] ?? []) { if (!rowFlags.includes(f)) rowFlags.push(f) }

                    return (
                      <tr
                        key={h.id}
                        style={{
                          borderBottom: idx < tableRows.length - 1 ? '1px solid #222222' : 'none',
                          transition: 'background 0.1s',
                          background: isEditing ? '#131313' : 'transparent',
                        }}
                        onMouseEnter={e => { if (!isEditing) e.currentTarget.style.background = '#141414' }}
                        onMouseLeave={e => { if (!isEditing) e.currentTarget.style.background = 'transparent' }}
                      >
                        {/* 1. Ticker */}
                        <td style={{ padding: '13px 8px 13px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, overflow: 'hidden' }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0, display: 'inline-block' }} />
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 16, color: '#fff', letterSpacing: '0.03em', flexShrink: 0 }}>
                              {h.ticker}
                            </span>
                            {rowFlags.length > 0 && (
                              <span style={{ display: 'flex', gap: 1, fontSize: 11, lineHeight: 1, flexShrink: 0 }}>
                                {rowFlags.map(f => (
                                  <span key={f} title={FLAG_LABELS[f]} style={{ opacity: 0.78, cursor: 'default' }}>{f}</span>
                                ))}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 2. Company */}
                        <td style={{ padding: '13px 8px' }}>
                          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#E0E0E0', fontSize: 16 }}>
                            {COMPANY_OVERRIDES[h.ticker] ?? h.company_name}
                          </span>
                        </td>

                        {/* 3. Qty — editable */}
                        <td style={{ padding: '13px 8px', textAlign: 'right' }}>
                          {isEditing ? (
                            <input
                              type="number" min="0" step="any"
                              value={editDraft.qty}
                              onChange={e => setEditDraft(d => ({ ...d, qty: e.target.value }))}
                              style={{ width: '100%', background: '#161616', border: '1px solid #444444', borderRadius: 6, color: '#FFFFFF', fontSize: 13, padding: '4px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                            />
                          ) : (
                            <span style={{ color: '#B8B8B8', fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>
                              {h.shares % 1 === 0 ? h.shares.toLocaleString() : h.shares.toFixed(4)}
                            </span>
                          )}
                        </td>

                        {/* 4. Avg Cost — editable */}
                        <td style={{ padding: '13px 8px', textAlign: 'right' }}>
                          {isEditing ? (
                            <input
                              type="number" min="0" step="any"
                              value={editDraft.avgCost}
                              onChange={e => setEditDraft(d => ({ ...d, avgCost: e.target.value }))}
                              style={{ width: '100%', background: '#161616', border: '1px solid #444444', borderRadius: 6, color: '#FFFFFF', fontSize: 13, padding: '4px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                            />
                          ) : (
                            <span style={{ color: '#B8B8B8', fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>
                              {usd(h.avg_buy_price, 2)}
                            </span>
                          )}
                        </td>

                        {/* 5. Current Price */}
                        <td style={{ padding: '13px 8px', textAlign: 'right' }}>
                          <span style={{ color: '#e0e0e0', fontSize: 15, fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                            {h.currentPrice != null ? usd(h.currentPrice, 2) : '—'}
                          </span>
                        </td>

                        {/* 6. Position Value */}
                        <td style={{ padding: '13px 8px', textAlign: 'right' }}>
                          <span style={{ color: '#e0e0e0', fontSize: 15, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                            {usd(h.value, 0)}
                          </span>
                        </td>

                        {/* 7. Day % */}
                        <td style={{ padding: '13px 8px', textAlign: 'right' }}>
                          {h.changePercent != null ? (
                            <span style={{ fontSize: 15, fontVariantNumeric: 'tabular-nums', ...dayPctStyle(h.changePercent) }}>
                              {h.changePercent >= 0 ? '+' : ''}{h.changePercent.toFixed(2)}%
                            </span>
                          ) : <span style={{ color: '#333' }}>—</span>}
                        </td>

                        {/* 8. Day $ */}
                        <td style={{ padding: '13px 8px', textAlign: 'right' }}>
                          {h.dailyDollar != null ? (
                            <span style={{ color: h.dailyDollar >= 0 ? '#00DC82' : '#FF5A5A', fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>
                              {h.dailyDollar >= 0 ? '+' : '-'}{usd(Math.abs(h.dailyDollar), 0)}
                            </span>
                          ) : <span style={{ color: '#333' }}>—</span>}
                        </td>

                        {/* 9. P&L % */}
                        <td style={{ padding: '13px 8px', textAlign: 'right' }}>
                          {h.pnlPct != null ? (
                            <span style={{ color: h.pnlPct >= 0 ? '#00DC82' : '#FF5A5A', fontSize: 15, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                              {h.pnlPct >= 0 ? '+' : ''}{h.pnlPct.toFixed(1)}%
                            </span>
                          ) : <span style={{ color: '#333' }}>—</span>}
                        </td>

                        {/* 10. P&L $ */}
                        <td style={{ padding: '13px 8px', textAlign: 'right' }}>
                          {h.pnlDollar != null ? (
                            <span style={{ color: h.pnlDollar >= 0 ? '#00DC82' : '#FF5A5A', fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>
                              {h.pnlDollar >= 0 ? '+' : '-'}{usd(Math.abs(h.pnlDollar), 0)}
                            </span>
                          ) : <span style={{ color: '#333' }}>—</span>}
                        </td>

                        {/* 10b. YTD % */}
                        <td style={{ padding: '13px 8px', textAlign: 'right' }}>
                          {h.ytdPct != null ? (
                            <span style={{ color: h.ytdPct >= 0 ? '#00DC82' : '#FF5A5A', fontSize: 15, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                              {h.ytdPct >= 0 ? '+' : ''}{h.ytdPct.toFixed(1)}%
                            </span>
                          ) : <span style={{ color: '#333' }}>—</span>}
                        </td>

                        {/* 11. vs ATH + drawdown class */}
                        <td style={{ padding: '13px 8px', textAlign: 'right' }}>
                          {h.athPct != null ? (() => {
                            const dc = drawdownClass(h.athPct)
                            const dcColor = dc === 'deep' ? '#FF5A5A' : dc === 'significant' ? '#FF8C00' : '#F5A623'
                            const dcLabel = dc === 'deep' ? 'deep' : dc === 'significant' ? 'signif.' : 'mild'
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                                <span style={{
                                  color: athWarning ? '#FF5A5A' : h.athPct >= -5 ? '#00DC82' : '#F5A623',
                                  fontSize: 15, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                                  background: athWarning ? 'rgba(255,90,90,0.10)' : 'transparent',
                                  padding: athWarning ? '2px 5px' : '0',
                                  borderRadius: athWarning ? 4 : 0,
                                }}>
                                  {h.athPct >= 0 ? '+' : ''}{h.athPct.toFixed(1)}%
                                </span>
                                {dc && (
                                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', color: dcColor, opacity: 0.75 }}>
                                    {dcLabel}
                                  </span>
                                )}
                              </div>
                            )
                          })() : <span style={{ color: '#333' }}>—</span>}
                        </td>

                        {/* 12. Weight % */}
                        <td style={{ padding: '13px 8px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                            <span style={{ color: '#e0e0e0', fontSize: 15, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                              {h.weight.toFixed(1)}%
                            </span>
                            <div style={{ width: 44, height: 2, background: '#1e1e1e', borderRadius: 1, overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(100, h.weight / 0.25)}%`, height: '100%', background: '#3b82f6', borderRadius: 1, opacity: 0.7 }} />
                            </div>
                          </div>
                        </td>

                        {/* 13. Status + Attention */}
                        <td style={{ padding: '13px 8px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                            <ThesisPill status={h.thesis_status} />
                            <AttentionBadge level={attentionLevel(h.changePercent, h.athPct)} />
                          </div>
                        </td>

                        {/* 14. Actions */}
                        <td style={{ padding: '13px 14px 13px 8px' }}>
                          {isEditing ? (
                            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <button
                                  onClick={() => handleSaveEdit(h.id)}
                                  disabled={editSaving}
                                  style={{ color: editSaving ? '#555' : '#00DC82', fontSize: 18, lineHeight: 1, cursor: editSaving ? 'default' : 'pointer', fontWeight: 700, transition: 'opacity 0.12s' }}
                                  onMouseEnter={e => { if (!editSaving) e.currentTarget.style.opacity = '0.7' }}
                                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                                  title="Save"
                                >{editSaving ? '…' : '✓'}</button>
                                <button
                                  onClick={() => { setEditingId(null); setEditError(null) }}
                                  style={{ color: '#555', fontSize: 16, lineHeight: 1, cursor: 'pointer', transition: 'color 0.12s' }}
                                  onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                                  onMouseLeave={e => (e.currentTarget.style.color = '#555')}
                                  title="Cancel"
                                >✕</button>
                              </span>
                              {editError && (
                                <span style={{ fontSize: 10, color: '#FF5A5A', whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }} title={editError}>
                                  {editError}
                                </span>
                              )}
                            </span>
                          ) : confirmDeleteId === h.id ? (
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, fontSize: 11 }}>
                              <button onClick={() => setConfirmDeleteId(null)} style={{ color: '#555', cursor: 'pointer' }} className="hover:text-white transition-colors">Cancel</button>
                              <button onClick={() => handleDelete(h.id)} style={{ color: '#FF5A5A', fontWeight: 600, cursor: 'pointer' }} className="hover:opacity-70 transition-opacity">Delete</button>
                            </span>
                          ) : (
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
                              <button
                                onClick={() => { setEditingId(h.id); setEditDraft({ qty: String(h.shares), avgCost: String(h.avg_buy_price) }); setEditError(null) }}
                                style={{ color: '#6A6A6A', cursor: 'pointer', fontSize: 12, transition: 'color 0.12s' }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#DADADA')}
                                onMouseLeave={e => (e.currentTarget.style.color = '#6A6A6A')}
                                title="Edit"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(h.id)}
                                style={{ color: '#6A6A6A', cursor: 'pointer', transition: 'color 0.12s' }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#FF5A5A')}
                                onMouseLeave={e => (e.currentTarget.style.color = '#6A6A6A')}
                                title="Delete"
                              >
                                <XIcon size={14} />
                              </button>
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}

                  {/* ── Cash row ── */}
                  <tr style={{ borderTop: '2px solid #252525', background: '#0C0C0C' }}>
                    {/* Ticker */}
                    <td style={{ padding: '13px 8px 13px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3b82f6', flexShrink: 0, display: 'inline-block' }} />
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: '#555', letterSpacing: '0.04em' }}>CASH</span>
                      </div>
                    </td>
                    {/* Company */}
                    <td style={{ padding: '13px 8px' }}>
                      <span style={{ color: '#444', fontSize: 14 }}>Cash & Equivalents</span>
                    </td>
                    {/* Qty, Avg Cost, Price — empty */}
                    <td /><td /><td />
                    {/* Value — editable cash amount */}
                    <td style={{ padding: '13px 8px', textAlign: 'right' }}>
                      {editingCash ? (
                        <input
                          type="number" min="0" step="1000" autoFocus
                          value={cashDraft}
                          onChange={e => setCashDraft(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveCash(); if (e.key === 'Escape') setEditingCash(false) }}
                          style={{ width: '100%', background: '#161616', border: '1px solid #444444', borderRadius: 6, color: '#FFFFFF', fontSize: 14, padding: '4px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                        />
                      ) : (
                        <span style={{ color: '#999', fontSize: 15, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                          {usd(cash, 0)}
                        </span>
                      )}
                    </td>
                    {/* Day%, Day$, P&L%, P&L$, YTD%, VS ATH — empty */}
                    <td /><td /><td /><td /><td /><td />
                    {/* Wt% — derived cash % */}
                    <td style={{ padding: '13px 8px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <span style={{ color: '#777', fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                          {cashPct.toFixed(1)}%
                        </span>
                        <div style={{ width: 44, height: 2, background: '#1e1e1e', borderRadius: 1, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, cashPct / 0.25)}%`, height: '100%', background: '#3b82f6', borderRadius: 1, opacity: 0.7 }} />
                        </div>
                      </div>
                    </td>
                    {/* Status — empty */}
                    <td />
                    {/* Actions */}
                    <td style={{ padding: '13px 14px 13px 8px' }}>
                      {editingCash ? (
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                          <button
                            onClick={handleSaveCash}
                            style={{ color: '#00DC82', fontSize: 18, lineHeight: 1, cursor: 'pointer', fontWeight: 700, transition: 'opacity 0.12s' }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                            title="Save cash"
                          >✓</button>
                          <button
                            onClick={() => setEditingCash(false)}
                            style={{ color: '#555', fontSize: 16, lineHeight: 1, cursor: 'pointer', transition: 'color 0.12s' }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#555')}
                            title="Cancel"
                          >✕</button>
                        </span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
                          <button
                            onClick={() => { setCashDraft(String(cash)); setEditingCash(true) }}
                            style={{ color: '#6A6A6A', cursor: 'pointer', fontSize: 12, transition: 'color 0.12s' }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#DADADA')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#6A6A6A')}
                            title="Edit cash"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>
          )}
        </div>

        )} {/* end holdings table conditional */}

        {/* AI Intelligence Panel — overview only */}
        {mainView === 'overview' && (
          <NewsIntelligencePanel
            items={intelItems}
            loading={intelLoading}
            onRefresh={() => {
              const changes: Record<string, number> = {}
              for (const h of holdings) {
                const cp = prices[h.ticker]?.change_percent
                if (cp != null) changes[h.ticker] = cp
              }
              fetchNewsIntel(true, changes)
            }}
          />
        )}

        {/* Attention Queue — overview only */}
        {mainView === 'overview' && (
          <AttentionQueue alerts={alerts} newsItems={newsItems} />
        )}

        {/* ── Dedicated views for non-overview navigation ── */}
        {mainView === 'intelligence' && <NewsIntelligence items={newsItems} />}

        {mainView === 'earnings' && (
          <EarningsPanel
            cards={earningsCards}
            loading={earningsLoading}
            onRefresh={() => fetchEarningsData(true)}
          />
        )}

        {mainView === 'thesis' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ThesisMonitor holdings={holdingsWithWeights as ThesisHolding[]} newsItems={newsItems} />
            <ConvictionMatrix holdings={holdingsWithWeights} cashPct={cashPct} />
          </div>
        )}

        {mainView === 'risk' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <RiskMonitor alerts={alerts} onStatusChange={updateAlertStatus} />
            <DecisionQueue holdings={holdingsWithWeights} alerts={alerts} intelItems={intelItems} />
          </div>
        )}

        {mainView === 'events' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <UpcomingTimeline events={events} />
            <UpcomingEvents events={events as CalendarEvent[]} />
          </div>
        )}

        {mainView === 'watchlist' && <WatchlistPanel items={watchlist} />}

        {mainView === 'policy' && (
          <PolicyWidget policy={policy} rules={rules} objectives={objectives} />
        )}

          </div> {/* end content area padding div */}
        </main>
      </div> {/* end body flex */}

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
