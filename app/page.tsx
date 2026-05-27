'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

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
  ticker: '',
  company_name: '',
  shares: '',
  avg_buy_price: '',
  category: '',
  thesis: '',
  conviction_score: '',
}

function usd(n: number, decimals = 0) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

function pct(n: number) {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
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

const inputClass =
  'w-full px-3 py-2 rounded-lg text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500'

const labelClass = 'block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1'

export default function Dashboard() {
  const [dark, setDark] = useState(false)
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [prices, setPrices] = useState<Record<string, PriceData>>({})
  const [pricesLoading, setPricesLoading] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [currency, setCurrency] = useState<'USD' | 'ILS'>('USD')

  const holdingsRef = useRef<Holding[]>([])

  useEffect(() => {
    const isDark = localStorage.getItem('theme') !== 'light'
    setDark(isDark)
    if (localStorage.getItem('currency') === 'ILS') setCurrency('ILS')
  }, [])

  const fetchPrices = useCallback(async (tickers: string[]) => {
    if (tickers.length === 0) return
    setPricesLoading(true)
    try {
      const all = [...new Set([...tickers, 'ILS=X'])]
      const res = await fetch(`/api/prices?tickers=${all.join(',')}`)
      if (!res.ok) throw new Error('failed')
      const data: (PriceData & { ticker: string })[] = await res.json()
      setPrices(prev => {
        const next = { ...prev }
        for (const item of data) next[item.ticker] = item
        return next
      })
    } catch {
      // silent fail — keep showing last known prices
    } finally {
      setPricesLoading(false)
    }
  }, [])

  const fetchHoldings = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('holdings')
      .select('id, ticker, company_name, shares, avg_buy_price')
      .eq('portfolio_id', 1)
    if (error) setFetchError(error.message)
    else {
      setFetchError(null)
      setHoldings(data ?? [])
      holdingsRef.current = data ?? []
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchHoldings() }, [fetchHoldings])

  // Fetch prices whenever the ticker list changes
  const tickerKey = holdings.map(h => h.ticker).sort().join(',')
  useEffect(() => {
    if (!tickerKey) return
    fetchPrices(tickerKey.split(','))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickerKey, fetchPrices])

  // Auto-refresh prices every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      const tickers = holdingsRef.current.map(h => h.ticker)
      if (tickers.length > 0) fetchPrices(tickers)
    }, REFRESH_MS)
    return () => clearInterval(interval)
  }, [fetchPrices])

  useEffect(() => {
    if (!showModal) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowModal(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showModal])

  function toggleTheme() {
    const next = !dark
    setDark(next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  const ilsRate = prices['ILS=X']?.current_price ?? null

  function toggleCurrency() {
    const next = currency === 'USD' ? 'ILS' : 'USD'
    setCurrency(next)
    localStorage.setItem('currency', next)
  }

  function fmtAmount(usdAmount: number, decimals = 0) {
    if (currency === 'ILS' && ilsRate) {
      return '₪' + new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(usdAmount * ilsRate)
    }
    return usd(usdAmount, decimals)
  }

  function field(key: keyof typeof EMPTY_FORM, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
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
        ticker: record.ticker,
        company_name: record.company_name,
        shares: record.shares,
        avg_buy_price: record.avg_buy_price,
        portfolio_id: 1,
      })
      error = e2
    }

    setSubmitting(false)
    if (error) { setFormError(error.message) } else { setShowModal(false); fetchHoldings() }
  }

  async function handleDelete(id: number) {
    const { error } = await supabase.from('holdings').delete().eq('id', id)
    if (error) setFetchError(error.message)
    else { setConfirmDeleteId(null); fetchHoldings() }
  }

  // --- Derived calculations ---
  const rows = holdings.map(h => {
    const p = prices[h.ticker]
    const currentPrice = p?.current_price ?? null
    const pnlPct = currentPrice != null
      ? ((currentPrice - h.avg_buy_price) / h.avg_buy_price) * 100
      : null
    const value = (currentPrice ?? h.avg_buy_price) * h.shares
    return { ...h, currentPrice, pnlPct, value, changePercent: p?.change_percent ?? null }
  }).sort((a, b) => b.value - a.value)

  const invested = rows.reduce((s, r) => s + r.value, 0)
  const total = invested + CASH
  const cashPct = total > 0 ? (CASH / total) * 100 : 0

  const sortedRows = rows.map(r => ({
    ...r,
    weight: total > 0 ? (r.value / total) * 100 : 0,
  }))

  const todayPnL = holdings.reduce((sum, h) => {
    const p = prices[h.ticker]
    if (!p?.change) return sum
    return sum + h.shares * p.change
  }, 0)

  const todayPnLPct = invested > 0 ? (todayPnL / (invested - todayPnL)) * 100 : 0
  const hasPrices = Object.keys(prices).length > 0

  return (
    <div className={dark ? 'dark' : ''}>
      <div
        className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 transition-colors"
        style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}
      >
        {/* Header */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold tracking-tight">Investor OS</span>
            {pricesLoading && (
              <span className="text-xs text-zinc-400 dark:text-zinc-500">Updating…</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              {ilsRate && (
                <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">
                  ₪{ilsRate.toFixed(3)}/$
                </span>
              )}
              <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden text-xs font-medium">
                <button
                  onClick={() => { setCurrency('USD'); localStorage.setItem('currency', 'USD') }}
                  className={`px-2.5 py-1.5 transition-colors ${currency === 'USD' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
                >
                  $
                </button>
                <button
                  onClick={() => { setCurrency('ILS'); localStorage.setItem('currency', 'ILS') }}
                  className={`px-2.5 py-1.5 transition-colors ${currency === 'ILS' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
                >
                  ₪
                </button>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Toggle theme"
            >
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </header>

        {/* Main */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-5">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Total Portfolio Value</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{loading ? '—' : fmtAmount(total)}</p>
            </div>

            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-5">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Cash</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{fmtAmount(CASH)}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{loading ? '—' : `${cashPct.toFixed(2)}%`}</p>
            </div>

            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-5">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Today&apos;s P&L</p>
              {!hasPrices || loading ? (
                <p className="text-2xl font-bold text-zinc-500 dark:text-zinc-500">—</p>
              ) : (
                <>
                  <p className={`text-2xl font-bold ${todayPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {fmtAmount(todayPnL)}
                  </p>
                  <p className={`text-sm mt-1 ${todayPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {pct(todayPnLPct)}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Holdings table */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Holdings</h2>
              <button
                onClick={() => { setForm(EMPTY_FORM); setFormError(null); setShowModal(true) }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <PlusIcon /> Add Stock
              </button>
            </div>

            {fetchError ? (
              <p className="px-5 py-8 text-center text-sm text-red-400">{fetchError}</p>
            ) : loading ? (
              <p className="px-5 py-8 text-center text-sm text-zinc-500">Loading…</p>
            ) : sortedRows.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-zinc-500">No holdings yet — add your first stock</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60">
                      <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Ticker</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hidden sm:table-cell">Company</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hidden md:table-cell">Shares</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Avg Buy</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Current</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">P&L%</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Weight</th>
                      <th className="w-16 px-3 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {sortedRows.map(h => (
                      <tr key={h.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                        <td className="px-4 py-3.5 font-mono font-semibold text-zinc-900 dark:text-zinc-100">{h.ticker}</td>
                        <td className="px-4 py-3.5 text-zinc-500 dark:text-zinc-400 hidden sm:table-cell">{h.company_name}</td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-zinc-700 dark:text-zinc-300 hidden md:table-cell">
                          {h.shares.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-zinc-500 dark:text-zinc-400">
                          {usd(h.avg_buy_price, 2)}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums font-medium text-zinc-900 dark:text-zinc-100">
                          {h.currentPrice != null ? fmtAmount(h.currentPrice, 2) : '—'}
                        </td>
                        <td className={`px-4 py-3.5 text-right tabular-nums font-medium ${
                          h.pnlPct == null ? 'text-zinc-400' :
                          h.pnlPct >= 0 ? 'text-emerald-500' : 'text-red-500'
                        }`}>
                          {h.pnlPct != null ? pct(h.pnlPct) : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                          {h.weight.toFixed(2)}%
                        </td>
                        <td className="px-3 py-3.5">
                          {confirmDeleteId === h.id ? (
                            <span className="flex items-center justify-end gap-2 text-xs">
                              <button onClick={() => setConfirmDeleteId(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">Cancel</button>
                              <button onClick={() => handleDelete(h.id)} className="font-medium text-red-500 hover:text-red-600">Delete</button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(h.id)}
                              className="flex ml-auto text-zinc-300 dark:text-zinc-700 hover:text-red-400 dark:hover:text-red-400 transition-colors"
                              aria-label={`Delete ${h.ticker}`}
                            >
                              <XIcon />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add Stock Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div className="w-full max-w-md rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-semibold">Add Stock</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
                <XIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleAdd} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Ticker *</label>
                  <input type="text" value={form.ticker} onChange={e => field('ticker', e.target.value)} placeholder="NVDA" autoFocus className={inputClass + ' font-mono uppercase'} />
                </div>
                <div>
                  <label className={labelClass}>Category</label>
                  <select value={form.category} onChange={e => field('category', e.target.value)} className={inputClass}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Company Name *</label>
                <input type="text" value={form.company_name} onChange={e => field('company_name', e.target.value)} placeholder="NVIDIA Corporation" className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Shares *</label>
                  <input type="number" min="0" step="any" value={form.shares} onChange={e => field('shares', e.target.value)} placeholder="50" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Avg Buy Price *</label>
                  <input type="number" min="0" step="any" value={form.avg_buy_price} onChange={e => field('avg_buy_price', e.target.value)} placeholder="450.00" className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Conviction Score (1–10)</label>
                <input type="number" min="1" max="10" value={form.conviction_score} onChange={e => field('conviction_score', e.target.value)} placeholder="8" className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Thesis</label>
                <textarea rows={3} value={form.thesis} onChange={e => field('thesis', e.target.value)} placeholder="Why are you investing in this stock?" className={inputClass + ' resize-none'} />
              </div>

              {formError && <p className="text-xs text-red-500 dark:text-red-400">{formError}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 disabled:opacity-50 transition-colors">
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
