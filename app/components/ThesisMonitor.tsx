'use client'

import { useState } from 'react'
import type { NewsItem } from './NewsIntelligence'

export interface ThesisHolding {
  id: number
  ticker: string
  company_name: string
  thesis?: string | null
  thesis_status?: string | null
  thesis_break_conditions?: string[] | null
  conviction_score?: number | null
  weight: number
}

interface Props {
  holdings: ThesisHolding[]
  newsItems: NewsItem[]
}

const STATUS_STYLE: Record<string, string> = {
  intact:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  weakening: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  broken:    'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  unknown:   'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
}

const STATUS_ORDER: Record<string, number> = { broken: 0, weakening: 1, unknown: 2, intact: 3 }

const CONVICTION_STYLE = (score: number | null | undefined) => {
  const s = score ?? 0
  if (s >= 8) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
  if (s >= 6) return 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400'
  if (s >= 4) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
  return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
}

const THESIS_IMPACT_STYLE: Record<string, string> = {
  breaking:   'text-red-600 dark:text-red-400',
  weakening:  'text-amber-600 dark:text-amber-400',
  supporting: 'text-emerald-600 dark:text-emerald-400',
}

function latestNewsDate(ticker: string, items: NewsItem[]): string | null {
  const match = items.find(n => n.ticker === ticker && n.published_at)
  if (!match?.published_at) return null
  const d = new Date(match.published_at)
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return '1d ago'
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function ThesisCard({ holding, news }: { holding: ThesisHolding; news: NewsItem[] }) {
  const [expanded, setExpanded] = useState(false)
  const status = holding.thesis_status ?? 'unknown'
  const newsDate = latestNewsDate(holding.ticker, news)
  const latestNews = news.filter(n => n.ticker === holding.ticker).slice(0, 3)
  const hasThesis = !!holding.thesis

  return (
    <div className="border-b border-zinc-100 dark:border-zinc-800/60 last:border-0">
      <button
        className="w-full text-left px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start gap-2 justify-between">
          <div className="flex-1 min-w-0">
            {/* Row 1: ticker + badges */}
            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
              <span className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">{holding.ticker}</span>

              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${STATUS_STYLE[status] ?? STATUS_STYLE.unknown}`}>
                {status}
              </span>

              {holding.conviction_score != null ? (
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${CONVICTION_STYLE(holding.conviction_score)}`}>
                  conv {holding.conviction_score}/10
                </span>
              ) : (
                <span className="text-xs text-zinc-400 dark:text-zinc-500">no conviction</span>
              )}

              {!hasThesis && (
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                  ⚠ No thesis
                </span>
              )}
            </div>

            {/* Row 2: weight + company + news date */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
              <span className="tabular-nums font-medium text-zinc-600 dark:text-zinc-300">{holding.weight.toFixed(1)}%</span>
              <span>{holding.company_name}</span>
              {newsDate && (
                <>
                  <span>·</span>
                  <span>news {newsDate}</span>
                </>
              )}
            </div>
          </div>
          <span className="text-zinc-300 dark:text-zinc-700 text-xs mt-1 shrink-0">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {hasThesis ? (
            <div>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Thesis</p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{holding.thesis}</p>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-3 py-2">
              <span className="text-red-500 shrink-0">⚠</span>
              <p className="text-xs text-red-700 dark:text-red-400">
                No investment thesis documented. A {holding.weight.toFixed(1)}% position without a thesis creates accountability risk.
              </p>
            </div>
          )}

          {holding.thesis_break_conditions && holding.thesis_break_conditions.length > 0 && (
            <div>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Break Conditions</p>
              <ul className="space-y-1">
                {holding.thesis_break_conditions.map((c, i) => (
                  <li key={i} className="flex gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                    <span className="text-red-400 shrink-0 mt-0.5">✕</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {latestNews.length > 0 && (
            <div>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Recent News</p>
              <div className="space-y-2">
                {latestNews.map(n => (
                  <div key={n.id} className="text-xs">
                    <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                      {n.thesis_impact && n.thesis_impact !== 'none' && (
                        <span className={`font-semibold ${THESIS_IMPACT_STYLE[n.thesis_impact] ?? ''}`}>
                          thesis {n.thesis_impact}
                        </span>
                      )}
                      {n.portfolio_impact_score != null && (
                        <span className="text-zinc-400">impact {n.portfolio_impact_score.toFixed(1)}</span>
                      )}
                      {n.published_at && (
                        <span className="text-zinc-400">{new Date(n.published_at).toLocaleDateString()}</span>
                      )}
                    </div>
                    <p className="text-zinc-700 dark:text-zinc-300 leading-snug">
                      {n.headline.slice(0, 110)}{n.headline.length > 110 ? '…' : ''}
                    </p>
                    {n.scoring_reason && (
                      <p className="text-zinc-400 dark:text-zinc-500 italic mt-0.5 leading-snug">{n.scoring_reason.slice(0, 140)}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function ThesisMonitor({ holdings, newsItems }: Props) {
  const broken   = holdings.filter(h => h.thesis_status === 'broken').length
  const weakened = holdings.filter(h => h.thesis_status === 'weakening').length
  const noThesis = holdings.filter(h => !h.thesis).length

  const sorted = [...holdings].sort((a, b) =>
    (STATUS_ORDER[a.thesis_status ?? 'unknown'] ?? 2) -
    (STATUS_ORDER[b.thesis_status ?? 'unknown'] ?? 2)
  )

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold">Thesis Monitor</h2>
        {broken > 0 && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
            {broken} broken
          </span>
        )}
        {weakened > 0 && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
            {weakened} weakening
          </span>
        )}
        {noThesis > 0 && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
            {noThesis} no thesis
          </span>
        )}
        {broken === 0 && weakened === 0 && noThesis === 0 && holdings.length > 0 && (
          <span className="text-xs text-emerald-500 dark:text-emerald-400">✓ All intact</span>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-zinc-400">No holdings with thesis data</p>
      ) : (
        <div>
          {sorted.map(h => (
            <ThesisCard key={h.id} holding={h} news={newsItems} />
          ))}
        </div>
      )}
    </div>
  )
}
