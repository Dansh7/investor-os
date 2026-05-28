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

const STATUS_ORDER: Record<string, number> = { broken: 0, weakening: 1, unknown: 2, intact: 3 }

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  intact:    { bg: 'rgba(0,220,130,0.08)',   color: '#00dc82' },
  weakening: { bg: 'rgba(245,166,35,0.10)',  color: '#f5a623' },
  broken:    { bg: 'rgba(255,77,77,0.10)',   color: '#ff4d4d' },
  unknown:   { bg: 'rgba(100,100,100,0.08)', color: '#555' },
}

const THESIS_IMPACT_COLOR: Record<string, string> = {
  breaking:   '#ff4d4d',
  weakening:  '#f5a623',
  supporting: '#00dc82',
}

function convBadge(score: number | null | undefined): { bg: string; color: string } {
  const s = score ?? 0
  if (s >= 8) return { bg: 'rgba(0,220,130,0.08)',   color: '#00dc82' }
  if (s >= 6) return { bg: 'rgba(96,165,250,0.10)',  color: '#60a5fa' }
  if (s >= 4) return { bg: 'rgba(245,166,35,0.10)',  color: '#f5a623' }
  return           { bg: 'rgba(255,77,77,0.10)',   color: '#ff4d4d' }
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

function ThesisCard({ holding, news, isLast }: { holding: ThesisHolding; news: NewsItem[]; isLast?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const status = (holding.thesis_status ?? 'unknown').toLowerCase()
  const newsDate = latestNewsDate(holding.ticker, news)
  const latestNews = news.filter(n => n.ticker === holding.ticker).slice(0, 3)
  const hasThesis = !!holding.thesis
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.unknown

  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid #1a1a1a' }}>
      <button
        className="w-full text-left px-4 py-3 transition-colors hover:bg-[#171717]"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start gap-2 justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
              <span className="font-mono text-sm font-bold text-white tracking-tight">{holding.ticker}</span>
              <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={badge}>{status}</span>
              {holding.conviction_score != null ? (
                <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={convBadge(holding.conviction_score)}>
                  conv {holding.conviction_score}/10
                </span>
              ) : (
                <span className="text-xs" style={{ color: '#555' }}>no conviction</span>
              )}
              {!hasThesis && (
                <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,77,77,0.10)', color: '#ff4d4d' }}>
                  ⚠ No thesis
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: '#555' }}>
              <span className="font-medium tabular-nums" style={{ color: '#9a9a9a' }}>{holding.weight.toFixed(1)}%</span>
              <span>{holding.company_name}</span>
              {newsDate && <><span>·</span><span>news {newsDate}</span></>}
            </div>
          </div>
          <span className="text-xs mt-1 shrink-0" style={{ color: '#333' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {hasThesis ? (
            <div>
              <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555', marginBottom: 4 }}>Thesis</p>
              <p className="text-sm leading-relaxed" style={{ color: '#c8c8c8' }}>{holding.thesis}</p>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-lg px-3 py-2" style={{ background: 'rgba(255,77,77,0.06)', border: '1px solid rgba(255,77,77,0.15)' }}>
              <span style={{ color: '#ff4d4d', flexShrink: 0 }}>⚠</span>
              <p className="text-xs" style={{ color: '#ff4d4d' }}>
                No investment thesis documented. A {holding.weight.toFixed(1)}% position without a thesis creates accountability risk.
              </p>
            </div>
          )}

          {holding.thesis_break_conditions && holding.thesis_break_conditions.length > 0 && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555', marginBottom: 6 }}>Break Conditions</p>
              <ul className="space-y-1">
                {holding.thesis_break_conditions.map((c, i) => (
                  <li key={i} className="flex gap-2 text-xs" style={{ color: '#9a9a9a' }}>
                    <span className="shrink-0 mt-0.5" style={{ color: '#ff4d4d' }}>✕</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {latestNews.length > 0 && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555', marginBottom: 6 }}>Recent News</p>
              <div className="space-y-2">
                {latestNews.map(n => (
                  <div key={n.id} className="text-xs">
                    <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                      {n.thesis_impact && n.thesis_impact !== 'none' && (
                        <span className="font-semibold" style={{ color: THESIS_IMPACT_COLOR[n.thesis_impact] ?? '#9a9a9a' }}>
                          thesis {n.thesis_impact}
                        </span>
                      )}
                      {n.portfolio_impact_score != null && (
                        <span style={{ color: '#555' }}>impact {n.portfolio_impact_score.toFixed(1)}</span>
                      )}
                      {n.published_at && (
                        <span style={{ color: '#555' }}>{new Date(n.published_at).toLocaleDateString()}</span>
                      )}
                    </div>
                    <p className="leading-snug" style={{ color: '#c8c8c8' }}>
                      {n.headline.slice(0, 110)}{n.headline.length > 110 ? '…' : ''}
                    </p>
                    {n.scoring_reason && (
                      <p className="italic mt-0.5 leading-snug" style={{ color: '#555' }}>{n.scoring_reason.slice(0, 140)}</p>
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
    <div className="rounded-xl overflow-hidden" style={{ background: '#111111', border: '1px solid #232323' }}>
      <div className="px-5 py-3.5 flex flex-wrap items-center gap-2" style={{ borderBottom: '1px solid #232323' }}>
        <h2 className="text-sm font-semibold text-white">Thesis Monitor</h2>
        {broken > 0 && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,77,77,0.10)', color: '#ff4d4d' }}>
            {broken} broken
          </span>
        )}
        {weakened > 0 && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,166,35,0.10)', color: '#f5a623' }}>
            {weakened} weakening
          </span>
        )}
        {noThesis > 0 && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,77,77,0.10)', color: '#ff4d4d' }}>
            {noThesis} no thesis
          </span>
        )}
        {broken === 0 && weakened === 0 && noThesis === 0 && holdings.length > 0 && (
          <span className="text-xs" style={{ color: '#00dc82' }}>✓ All intact</span>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm" style={{ color: '#555' }}>No holdings with thesis data</p>
      ) : (
        <div>
          {sorted.map((h, idx) => (
            <ThesisCard key={h.id} holding={h} news={newsItems} isLast={idx === sorted.length - 1} />
          ))}
        </div>
      )}
    </div>
  )
}
