'use client'

import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IntelItem {
  ticker:       string
  company_name: string
  routing:      'immediate' | 'daily' | 'weekly' | 'ignore'
  cacheHit:     boolean
  gateBlocked:  boolean
  scored: {
    importance_score:       number
    portfolio_impact_score: number
    thesis_impact:  'supporting' | 'weakening' | 'breaking' | 'neutral'
    action_type:    string
    hebrew_title:   string
    hebrew_summary: string
    confidence_score: number
  } | null
  perplexity: { sources: string[] } | null
  validation: {
    flags: { type: string; severity: string; message: string }[]
    confidence_override: boolean
    hebrew_warning?: string
    importance_score: number
  }
  error?: string
}

interface Props {
  items:     IntelItem[]
  loading:   boolean
  onRefresh: () => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const THESIS_COLOR: Record<string, string> = {
  supporting: '#00DC82',
  weakening:  '#F5A623',
  breaking:   '#FF5A5A',
  neutral:    '#383838',
}

const TAB_LABELS: Record<string, string> = {
  immediate: 'מיידי',
  daily:     'יומי',
  weekly:    'שבועי',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sourceDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', '') } catch { return url.slice(0, 30) }
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      style={{ animation: spinning ? 'spin 0.8s linear infinite' : 'none' }}
    >
      <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function NewsCard({ item }: { item: IntelItem }) {
  const { scored, perplexity, validation } = item
  if (!scored) return null

  const thesisColor  = THESIS_COLOR[scored.thesis_impact] ?? '#383838'
  const hasWarning   = validation.confidence_override || validation.flags.length > 0
  const importance   = validation.importance_score ?? scored.importance_score

  return (
    <div style={{
      background: '#111111',
      border: '1px solid #1C1C1C',
      borderLeft: `3px solid ${thesisColor}`,
      borderRadius: 10,
      padding: '14px 16px',
      direction: 'rtl',
    }}>
      {/* Header row: ticker badge + title */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <span style={{
          flexShrink: 0,
          fontFamily: 'monospace', fontWeight: 700, fontSize: 12,
          color: thesisColor,
          background: `${thesisColor}18`,
          border: `1px solid ${thesisColor}44`,
          padding: '2px 7px', borderRadius: 4,
          letterSpacing: '0.04em',
        }}>
          {item.ticker}
        </span>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#E8E8E8', lineHeight: 1.35 }}>
          {scored.hebrew_title || '—'}
        </span>
      </div>

      {/* Hebrew summary */}
      {scored.hebrew_summary && (
        <p style={{
          fontSize: 14, color: '#AAAAAA', lineHeight: 1.6, margin: '0 0 10px',
          direction: 'rtl', textAlign: 'right',
        }}>
          {scored.hebrew_summary}
        </p>
      )}

      {/* Footer: scores + sources + warning */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        {/* Score badges */}
        <span style={{ fontSize: 11, color: '#666', fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ color: '#888' }}>חשיבות </span>
          <span style={{ color: '#CFCFCF', fontWeight: 600 }}>{importance}</span>
          <span style={{ color: '#444', margin: '0 4px' }}>·</span>
          <span style={{ color: '#888' }}>השפעה </span>
          <span style={{ color: '#CFCFCF', fontWeight: 600 }}>{scored.portfolio_impact_score}</span>
        </span>

        {/* Source links */}
        {perplexity?.sources && perplexity.sources.length > 0 && (
          <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {perplexity.sources.slice(0, 3).map((s, i) => (
              <a
                key={i} href={s} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11, color: '#555', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#888')}
                onMouseLeave={e => (e.currentTarget.style.color = '#555')}
              >
                {sourceDomain(s)}
              </a>
            ))}
          </span>
        )}

        {/* Warning flag */}
        {hasWarning && (
          <span style={{
            fontSize: 11, color: '#F5A623',
            background: 'rgba(245,166,35,0.08)',
            padding: '1px 6px', borderRadius: 3,
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            ⚠ {validation.hebrew_warning ?? `${validation.flags.length} דגל`}
          </span>
        )}

        {/* Cache indicator */}
        {item.cacheHit && (
          <span style={{ fontSize: 10, color: '#333', marginRight: 'auto' }}>מטמון</span>
        )}
      </div>
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function NewsIntelligencePanel({ items, loading, onRefresh }: Props) {
  const [activeTab, setActiveTab] = useState<'immediate' | 'daily' | 'weekly'>('immediate')

  const visible = items.filter(i => !i.gateBlocked && i.routing !== 'ignore' && i.scored)
  const byRoute = {
    immediate: visible.filter(i => i.routing === 'immediate'),
    daily:     visible.filter(i => i.routing === 'daily'),
    weekly:    visible.filter(i => i.routing === 'weekly'),
  }

  const tabs: ('immediate' | 'daily' | 'weekly')[] = ['immediate', 'daily', 'weekly']
  const active = byRoute[activeTab]

  return (
    <div style={{
      background: '#0E0E0E',
      border: '1px solid #1C1C1C',
      borderRadius: 16, overflow: 'hidden',
    }}>
      {/* ── Header ── */}
      <div style={{
        borderBottom: '1px solid #1C1C1C',
        padding: '16px 22px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 17, fontWeight: 600, color: '#E8E8E8', letterSpacing: '-0.01em' }}>
            בינה מלאכותית
          </span>
          {!loading && visible.length > 0 && (
            <span style={{ fontSize: 13, color: '#555', fontWeight: 500 }}>
              {visible.length} עדכונים
            </span>
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            color: loading ? '#444' : '#909090', fontSize: 13, cursor: loading ? 'default' : 'pointer',
            background: '#161616', border: '1px solid #363636',
            padding: '7px 14px', borderRadius: 8, transition: 'color 0.12s, border-color 0.12s',
          }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#555' } }}
          onMouseLeave={e => { e.currentTarget.style.color = loading ? '#444' : '#909090'; e.currentTarget.style.borderColor = '#363636' }}
        >
          <RefreshIcon spinning={loading} />
          {loading ? 'טוען…' : 'רענן חדשות'}
        </button>
      </div>

      {/* ── Tabs ── */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #161616',
        direction: 'rtl',
      }}>
        {tabs.map(tab => {
          const count = byRoute[tab].length
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '11px 20px',
                fontSize: 14, fontWeight: activeTab === tab ? 600 : 400,
                color: activeTab === tab ? '#F0F0F0' : '#404040',
                borderBottom: `2px solid ${activeTab === tab ? '#E0E0E0' : 'transparent'}`,
                background: activeTab === tab ? 'rgba(255,255,255,0.04)' : 'transparent',
                cursor: 'pointer', transition: 'color 0.1s',
                marginBottom: -1, display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {TAB_LABELS[tab]}
              {count > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  color: activeTab === tab ? '#E0E0E0' : '#383838',
                  background: activeTab === tab ? 'rgba(255,255,255,0.1)' : '#1a1a1a',
                  padding: '1px 6px', borderRadius: 10,
                }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '16px 20px', direction: 'rtl' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '28px 0', color: '#333', fontSize: 14 }}>
            טוען עדכונים…
          </div>
        ) : active.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 0', color: '#333', fontSize: 14 }}>
            אין עדכונים רלוונטיים כרגע
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {active.map(item => <NewsCard key={item.ticker} item={item} />)}
          </div>
        )}
      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
