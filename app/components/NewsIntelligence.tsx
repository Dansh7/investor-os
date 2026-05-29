'use client'

import { useState } from 'react'

export interface NewsItem {
  id: string
  ticker?: string | null
  headline: string
  source?: string | null
  source_url?: string | null
  published_at?: string | null
  importance_score?: number | null
  portfolio_impact_score?: number | null
  urgency_score?: number | null
  confidence_score?: number | null
  thesis_impact?: string | null
  action_type?: string | null
  is_verified?: boolean | null
  scoring_reason?: string | null
  sentiment?: string | null
  summary?: string | null
  tags?: string[] | null
}

interface Props {
  items: NewsItem[]
}

const BUCKET_ORDER = ['immediate', 'daily', 'weekly'] as const
type Bucket = typeof BUCKET_ORDER[number]

const BUCKET_META: Record<Bucket, { label: string; dotColor: string; badgeBg: string; badgeColor: string }> = {
  immediate: { label: 'מיידי',  dotColor: '#FF5A5A', badgeBg: 'rgba(255,90,90,0.10)',  badgeColor: '#FF5A5A' },
  daily:     { label: 'יומי',   dotColor: '#F5A623', badgeBg: 'rgba(245,166,35,0.10)', badgeColor: '#F5A623' },
  weekly:    { label: 'שבועי',  dotColor: '#60a5fa', badgeBg: 'rgba(96,165,250,0.10)', badgeColor: '#60a5fa' },
}

const THESIS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  breaking:   { label: 'שוברת תזה',   bg: 'rgba(255,90,90,0.10)',  color: '#FF5A5A' },
  weakening:  { label: 'מחלישה',      bg: 'rgba(245,166,35,0.10)', color: '#F5A623' },
  supporting: { label: 'מחזקת',       bg: 'rgba(0,220,130,0.08)',  color: '#00DC82' },
}

const SENTIMENT_HE: Record<string, string> = {
  positive: 'חיובי',
  negative: 'שלילי',
  neutral:  'ניטרלי',
  mixed:    'מעורב',
}
const SENTIMENT_COLOR: Record<string, string> = {
  positive: '#00DC82',
  negative: '#FF5A5A',
  neutral:  '#555',
  mixed:    '#F5A623',
}

function newsHebrewHeadline(item: NewsItem): string {
  const t = item.ticker ?? ''
  const prefix = t ? `${t} — ` : ''
  const tags = item.tags ?? []

  if (item.thesis_impact === 'breaking')  return `${prefix}אירוע שוברת תזה`
  if (item.thesis_impact === 'weakening') return `${prefix}אות להחלשת תזה`
  if (item.thesis_impact === 'supporting') return `${prefix}חיזוק תזת ההשקעה`

  if (tags.includes('earnings') && tags.includes('guidance')) return `${prefix}רווחים והנחיה קדימה`
  if (tags.includes('earnings'))   return `${prefix}עדכון רווחים`
  if (tags.includes('m&a'))        return `${prefix}פעילות מיזוגים ורכישות`
  if (tags.includes('management')) return `${prefix}שינוי הנהלה`
  if (tags.includes('regulatory')) return `${prefix}אירוע רגולטורי`
  if (tags.includes('dilution'))   return `${prefix}סיכון דילול`
  if (tags.includes('guidance'))   return `${prefix}הנחיה עדכנית לשוק`
  if (tags.includes('debt'))       return `${prefix}פעילות מימון`
  if (tags.includes('dividend'))   return `${prefix}עדכון דיבידנד`

  if (item.action_type === 'immediate') return `${prefix}דורש בחינה מיידית`
  if (item.action_type === 'daily')     return `${prefix}מעקב שוטף`
  return `${prefix}עדכון שוק`
}

function newsHebrewContext(item: NewsItem): string {
  const parts: string[] = []

  if (item.thesis_impact === 'breaking')   parts.push('האירוע עלול לפרוץ את הנחות הבסיס של ההשקעה — נדרשת בחינה מחדש.')
  else if (item.thesis_impact === 'weakening')  parts.push('הכתבה מחלישה את ההנחות הבסיסיות. יש לעקוב מקרוב.')
  else if (item.thesis_impact === 'supporting') parts.push('הכתבה תומכת בתזת ההשקעה הקיימת.')

  if (item.portfolio_impact_score != null) {
    if (item.portfolio_impact_score >= 8) parts.push('השפעה גבוהה צפויה על התיק.')
    else if (item.portfolio_impact_score >= 6) parts.push('השפעה בינונית צפויה על התיק.')
    else if (item.portfolio_impact_score >= 4) parts.push('השפעה נמוכה על התיק.')
  }

  if (item.urgency_score != null && item.urgency_score >= 7) parts.push('רמת דחיפות גבוהה.')

  if (item.sentiment === 'negative') parts.push('סנטימנט שוק שלילי.')
  else if (item.sentiment === 'positive') parts.push('סנטימנט שוק חיובי.')

  return parts.join(' ') || 'ראה פרטים במקור.'
}

function NewsRow({ item, isLast }: { item: NewsItem; isLast?: boolean }) {
  const [expanded, setExpanded] = useState(false)

  const thesisBadge = item.thesis_impact && item.thesis_impact !== 'none'
    ? THESIS_BADGE[item.thesis_impact]
    : null
  const sentimentColor = SENTIMENT_COLOR[item.sentiment ?? ''] ?? '#555'

  const heHeadline = newsHebrewHeadline(item)
  const heContext  = newsHebrewContext(item)

  return (
    <div
      style={{
        padding: '18px 24px',
        borderBottom: isLast ? 'none' : '1px solid #1a1a1a',
        cursor: 'pointer',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#141414')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      onClick={() => setExpanded(e => !e)}
    >
      {/* Row 1: ticker + badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        {item.ticker && (
          <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
            {item.ticker}
          </span>
        )}
        {item.is_verified ? (
          <span style={{ background: 'rgba(0,220,130,0.08)', color: '#00DC82', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4 }}>
            מאומת
          </span>
        ) : (
          <span style={{ background: 'rgba(100,100,100,0.08)', color: '#3A3A3A', fontSize: 10, padding: '2px 7px', borderRadius: 4 }}>
            לא מאומת
          </span>
        )}
        {thesisBadge && (
          <span style={{ background: thesisBadge.bg, color: thesisBadge.color, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4 }}>
            {thesisBadge.label}
          </span>
        )}
        {item.sentiment && item.sentiment !== 'neutral' && (
          <span style={{ fontSize: 11, fontWeight: 500, color: sentimentColor }}>
            {SENTIMENT_HE[item.sentiment] ?? item.sentiment}
          </span>
        )}
      </div>

      {/* Row 2: Hebrew headline — primary */}
      <p style={{ fontSize: 14, fontWeight: 600, color: '#F0F0F0', lineHeight: 1.45, marginBottom: 5 }}>
        {heHeadline}
      </p>

      {/* Row 3: Hebrew context */}
      <p style={{ fontSize: 12, color: '#7A7A7A', lineHeight: 1.55, marginBottom: 8 }}>
        {heContext}
      </p>

      {/* Row 4: scores + source */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        {item.portfolio_impact_score != null && (
          <span style={{ fontSize: 11, color: '#4A4A4A' }}>
            השפעה: <span style={{ color: '#7A7A7A', fontWeight: 600 }}>{item.portfolio_impact_score.toFixed(0)}/10</span>
          </span>
        )}
        {item.urgency_score != null && (
          <span style={{ fontSize: 11, color: '#4A4A4A' }}>
            דחיפות: <span style={{ color: '#7A7A7A', fontWeight: 600 }}>{item.urgency_score.toFixed(0)}/10</span>
          </span>
        )}
        {item.source && <span style={{ fontSize: 11, color: '#3A3A3A' }}>{item.source}</span>}
        {item.published_at && (
          <span style={{ fontSize: 11, color: '#3A3A3A' }}>
            {new Date(item.published_at).toLocaleDateString('he-IL', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      {/* Expanded: English headline + summary */}
      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #1e1e1e' }}>
          <p style={{ fontSize: 11, color: '#4A4A4A', lineHeight: 1.55, marginBottom: 6, fontStyle: 'italic' }}>
            {item.headline}
          </p>
          {item.summary && (
            <p style={{ fontSize: 12, color: '#B3B3B3', lineHeight: 1.6, marginBottom: 8 }}>{item.summary}</p>
          )}
          {item.scoring_reason && (
            <p style={{ fontSize: 11, color: '#4A4A4A', lineHeight: 1.5, fontStyle: 'italic' }}>{item.scoring_reason}</p>
          )}
          {item.source_url && (
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-block', marginTop: 8, fontSize: 11, color: '#5A8FFF' }}
              onClick={e => e.stopPropagation()}
            >
              ← מקור
            </a>
          )}
        </div>
      )}
    </div>
  )
}

export function NewsIntelligence({ items }: Props) {
  const [activeTab, setActiveTab] = useState<Bucket>('immediate')

  const byBucket: Record<Bucket, NewsItem[]> = { immediate: [], daily: [], weekly: [] }
  for (const item of items) {
    const b = (item.action_type ?? '') as Bucket
    if (b in byBucket) byBucket[b].push(item)
  }

  const effectiveTab: Bucket = byBucket[activeTab].length > 0
    ? activeTab
    : BUCKET_ORDER.find(b => byBucket[b].length > 0) ?? 'immediate'

  const displayItems = byBucket[effectiveTab]

  return (
    <div style={{ background: '#111111', border: '1px solid #1a1a1a', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: '14px 24px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          מודיעין שוק
        </h2>
        <span style={{ fontSize: 11, color: '#4A4A4A' }}>{items.length} כתבות מדורגות</span>
      </div>

      {items.length === 0 ? (
        <p style={{ padding: '40px 24px', textAlign: 'center', fontSize: 13, color: '#3A3A3A' }}>
          אין כתבות מדורגות — הרץ את צינור הסיקור
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', borderBottom: '1px solid #1a1a1a' }}>
            {BUCKET_ORDER.map(bucket => {
              const meta = BUCKET_META[bucket]
              const count = byBucket[bucket].length
              const isActive = effectiveTab === bucket
              return (
                <button
                  key={bucket}
                  onClick={() => setActiveTab(bucket)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '10px 12px',
                    fontSize: 12,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#FFFFFF' : '#4A4A4A',
                    borderBottom: `2px solid ${isActive ? '#FFFFFF' : 'transparent'}`,
                    background: 'transparent',
                    cursor: 'pointer',
                    transition: 'color 0.12s',
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: meta.dotColor, flexShrink: 0 }} />
                  {meta.label}
                  {count > 0 && (
                    <span style={{ background: meta.badgeBg, color: meta.badgeColor, fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 10 }}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {displayItems.length === 0 ? (
            <p style={{ padding: '32px 24px', textAlign: 'center', fontSize: 13, color: '#3A3A3A' }}>
              אין פריטים ב{BUCKET_META[effectiveTab].label}
            </p>
          ) : (
            <div style={{ maxHeight: 480, overflowY: 'auto' }}>
              {displayItems.map((item, idx) => (
                <NewsRow key={item.id} item={item} isLast={idx === displayItems.length - 1} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
