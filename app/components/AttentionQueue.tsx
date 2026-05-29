'use client'

import { useState } from 'react'

export interface AlertRow {
  id: string
  ticker: string
  alert_type: string
  alert_status: string
  priority: number
  title: string
  body?: string | null
  message?: string | null
  triggered_at: string
  metadata?: {
    thesis_impact?: string
    portfolio_impact_score?: number
    urgency_score?: number
    sentiment?: string
  } | null
}

export interface NewsItem {
  id: string
  ticker?: string | null
  headline: string
  source?: string | null
  source_url?: string | null
  summary?: string | null
  tags?: string[] | null
  thesis_impact?: string | null
  action_type?: string | null
  portfolio_impact_score?: number | null
  urgency_score?: number | null
  confidence_score?: number | null
  importance_score?: number | null
  is_verified?: boolean | null
  scoring_reason?: string | null
  sentiment?: string | null
  published_at?: string | null
}

interface AttentionItem {
  id: string
  ticker: string
  priority: 'critical' | 'high' | 'medium'
  category: string
  whyItMatters: string
  timestamp?: string
  portfolioImpact?: number
  urgency?: number
}

interface Props {
  alerts: AlertRow[]
  newsItems: NewsItem[]
}

// Priority visual config
const SEV_BORDER: Record<string, string> = {
  critical: '#FF5A5A',
  high:     '#F5A623',
  medium:   '#242424',
}

const SEV_BADGE: Record<string, { bg: string; color: string }> = {
  critical: { bg: 'rgba(255,90,90,0.12)',  color: '#FF5A5A' },
  high:     { bg: 'rgba(245,166,35,0.12)', color: '#F5A623' },
  medium:   { bg: 'rgba(100,100,100,0.10)', color: '#7A7A7A' },
}

const SEV_LABEL: Record<string, string> = {
  critical: 'קריטי',
  high:     'לבדיקה',
  medium:   'מעקב',
}

// Category → Hebrew title
const CATEGORY_HE: Record<string, string> = {
  'Thesis trigger':       'פריצת תזה',
  'Thesis concern':       'חשש בתזה',
  'Earnings activity':    'עדכון רווחים',
  'Earnings & guidance':  'רווחים והנחיה',
  'Financing activity':   'פעילות מימון',
  'Management change':    'שינוי הנהלה',
  'Regulatory activity':  'אירוע רגולטורי',
  'Regulatory event':     'אירוע רגולטורי',
  'Acquisition activity': 'פעילות רכישה',
  'Market guidance':      'הנחיית שוק',
  'Dilution risk':        'סיכון דילול',
  'Dividend event':       'עדכון דיבידנד',
  'Delisting notice':     'הודעת מחיקה',
  'Activity detected':    'פעילות זוהתה',
  'Auditor change':       'שינוי רואה חשבון',
  'Critical alert':       'התראה קריטית',
  'Warning alert':        'אזהרה פעילה',
  'No thesis':            'חסרת תזה',
  'Low conviction':       'אמון נמוך',
  'Overweight':           'חשיפת יתר',
}

function heCategory(cat: string): string {
  return CATEGORY_HE[cat] ?? cat
}

// Category → short Hebrew executive summary (replaces raw English text in default view)
function hebrewSummary(category: string, ticker: string): string {
  const t = ticker
  const templates: Record<string, string> = {
    'Thesis trigger':       `${t} עברה אירוע שמאתגר את תזת ההשקעה. נדרשת בחינה מחדש.`,
    'Thesis concern':       `${t} מצביעה על חולשה בתזת ההשקעה. יש לעקוב מקרוב.`,
    'Earnings activity':    `${t} פרסמה עדכון רווחים. בחן את הנתונים מול הציפיות.`,
    'Earnings & guidance':  `${t} פרסמה רווחים והנחיה קדימה. בחן פער מול הצפי.`,
    'Financing activity':   `${t} ביצעה פעילות מימון. בדוק השפעה על מבנה ההון.`,
    'Management change':    `${t} ביצעה שינוי הנהלה. בחן השפעה על הכיוון האסטרטגי.`,
    'Regulatory activity':  `${t} מול אירוע רגולטורי. עלול להשפיע על מהלך הפעילות.`,
    'Regulatory event':     `${t} מול אירוע רגולטורי. עלול להשפיע על מהלך הפעילות.`,
    'Acquisition activity': `${t} מעורבת בפעילות רכישה. עשויה להשפיע על שווי ומיקוד.`,
    'Market guidance':      `${t} עדכנה הנחיה לשוק. בחן פער מול הציפיות הקיימות.`,
    'Dilution risk':        `${t} — סיכון לדילול בעלי מניות. בדוק נפח ההנפקה הפוטנציאלי.`,
    'Dividend event':       `${t} עם עדכון בדיבידנד. בחן השלכות על תזרים ואסטרטגיה.`,
    'Delisting notice':     `${t} עלולה להיות מוסרת מהבורסה. סיכון גבוה — בחן מיידית.`,
    'Auditor change':       `${t} החליפה רואה חשבון. בחן את הנסיבות — ייתכן סימן אזהרה.`,
    'Activity detected':    `${t} — זוהתה פעילות שדורשת בדיקה נוספת.`,
    'Critical alert':       `${t} — התראה קריטית. נדרשת תשומת לב מיידית.`,
    'Warning alert':        `${t} — אזהרה פעילה הדורשת בחינה.`,
    'No thesis':            `${t} מוחזקת ללא תזה מתועדת. חשיפה ללא הגדרת מסגרת.`,
    'Low conviction':       `${t} — אמון נמוך עם משקל משמעותי. שקול בחינה מחדש.`,
    'Overweight':           `${t} חורגת מהגבול המקסימלי שהוגדר. שקול איזון מחדש.`,
  }
  return templates[category] ?? `${t} — פעילות זוהתה הדורשת בחינה.`
}

function firstSentence(text: string, maxLen = 110): string {
  if (!text) return ''
  const dot = text.indexOf('. ')
  if (dot > 0 && dot < maxLen) return text.slice(0, dot + 1).trim()
  if (text.length <= maxLen) return text.trim()
  return text.slice(0, maxLen).trim() + '…'
}

function deriveAlertCategory(alertType: string, body: string): string {
  if (alertType === 'thesis_break') return 'Thesis trigger'
  if (alertType === 'thesis_risk') return 'Thesis concern'
  return deriveFromText(body)
}

function deriveNewsCategory(tags: string[], summary: string, thesisImpact: string): string {
  if (thesisImpact === 'breaking') return 'Thesis trigger'
  if (thesisImpact === 'weakening') return 'Thesis concern'
  const tagMap: Record<string, string> = {
    dilution: 'Dilution risk', 'm&a': 'Acquisition activity', debt: 'Financing activity',
    regulatory: 'Regulatory event', management: 'Management change', dividend: 'Dividend event',
    guidance: 'Market guidance', earnings: 'Earnings activity',
  }
  for (const [tag, label] of Object.entries(tagMap)) {
    if (tags.includes(tag)) {
      if (tag === 'earnings' && tags.includes('guidance')) return 'Earnings & guidance'
      return label
    }
  }
  return deriveFromText(summary)
}

function deriveFromText(text: string): string {
  const t = text.toLowerCase()
  if (t.includes('audit') || t.includes('certif')) return 'Auditor change'
  if (t.includes('acqui') || t.includes('merger') || t.includes('disposition')) return 'Acquisition activity'
  if (t.includes('dilut') || t.includes('unregistered') || t.includes('equity securities')) return 'Dilution risk'
  if (t.includes('delist')) return 'Delisting notice'
  if (t.includes('debt') || t.includes('obligation') || t.includes('credit') || t.includes('financ')) return 'Financing activity'
  if (t.includes('earnings') || t.includes('results of operations') || t.includes('revenue')) return 'Earnings activity'
  if (t.includes('guidance') || t.includes('outlook') || t.includes('reg fd')) return 'Market guidance'
  if (t.includes('regulat') || t.includes('compliance')) return 'Regulatory activity'
  if (t.includes('appoint') || t.includes('depart') || t.includes('resign') || t.includes('director')) return 'Management change'
  return 'Activity detected'
}

function buildItems(alerts: AlertRow[], newsItems: NewsItem[]): AttentionItem[] {
  const items: AttentionItem[] = []
  const seenTickers = new Set<string>()

  for (const a of alerts.filter(a => a.alert_status === 'active')) {
    if (seenTickers.has(a.ticker)) continue
    seenTickers.add(a.ticker)
    const body = a.body || a.message || a.title || ''
    items.push({
      id: `alert-${a.id}`,
      ticker: a.ticker,
      priority: a.priority >= 8 ? 'critical' : 'high',
      category: deriveAlertCategory(a.alert_type, body),
      whyItMatters: firstSentence(a.body || a.message || a.title || ''),
      timestamp: a.triggered_at,
      portfolioImpact: a.metadata?.portfolio_impact_score,
      urgency: a.metadata?.urgency_score,
    })
  }

  const actionItems = newsItems.filter(n => n.action_type === 'immediate' || n.action_type === 'daily')
  for (const n of actionItems) {
    if (!n.ticker || seenTickers.has(n.ticker)) continue
    seenTickers.add(n.ticker)
    const summary = n.summary || n.headline
    items.push({
      id: `news-${n.id}`,
      ticker: n.ticker,
      priority: n.action_type === 'immediate' ? 'high' : 'medium',
      category: deriveNewsCategory(n.tags ?? [], summary, n.thesis_impact ?? 'none'),
      whyItMatters: firstSentence(summary),
      timestamp: n.published_at ?? undefined,
      portfolioImpact: n.portfolio_impact_score ?? undefined,
      urgency: n.urgency_score ?? undefined,
    })
  }

  const order = { critical: 0, high: 1, medium: 2 }
  return items.sort((a, b) => order[a.priority] - order[b.priority])
}

function ImpactLevel({ value }: { value: number }) {
  const label = value >= 8 ? 'גבוה' : value >= 6 ? 'בינוני' : value >= 4 ? 'נמוך' : 'מינימלי'
  const color = value >= 8 ? '#FF5A5A' : value >= 6 ? '#F5A623' : '#7A7A7A'
  return <span style={{ fontSize: 11, fontWeight: 600, color }}>השפעה {label}</span>
}

function AttentionCard({ item, isLast }: { item: AttentionItem; isLast?: boolean }) {
  const [expanded, setExpanded] = useState(false)

  const date = item.timestamp
    ? new Date(item.timestamp).toLocaleDateString('he-IL', { month: 'short', day: 'numeric' })
    : null

  const heSummary = hebrewSummary(item.category, item.ticker)

  return (
    <button
      onClick={() => setExpanded(e => !e)}
      className="w-full text-left transition-colors"
      style={{
        padding: '16px 20px',
        borderLeft: `3px solid ${SEV_BORDER[item.priority]}`,
        borderBottom: isLast ? 'none' : '1px solid #1a1a1a',
        background: 'transparent',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#171717')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <div className="flex items-center gap-2.5">
          <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
            {item.ticker}
          </span>
          <span style={{ background: SEV_BADGE[item.priority].bg, color: SEV_BADGE[item.priority].color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, letterSpacing: '0.04em' }}>
            {SEV_LABEL[item.priority]}
          </span>
        </div>
        {item.portfolioImpact != null && <ImpactLevel value={item.portfolioImpact} />}
      </div>

      {/* Hebrew category title */}
      <p style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF', marginBottom: 5 }}>
        {heCategory(item.category)}
      </p>

      {/* Hebrew executive summary — primary visible text */}
      <p style={{ fontSize: 12, color: '#B3B3B3', lineHeight: 1.55 }}>{heSummary}</p>

      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #1e1e1e' }}>
          {/* Original source text */}
          {item.whyItMatters && (
            <p style={{ fontSize: 11, color: '#4A4A4A', lineHeight: 1.5, marginBottom: 8, fontStyle: 'italic' }}>
              {item.whyItMatters}
            </p>
          )}
          <div className="flex items-center gap-4" style={{ fontSize: 11, color: '#4A4A4A' }}>
            {date && <span>{date}</span>}
            {item.urgency != null && <span>דחיפות {item.urgency.toFixed(0)}/10</span>}
            {item.portfolioImpact != null && <span>השפעה {item.portfolioImpact.toFixed(0)}/10</span>}
          </div>
        </div>
      )}
    </button>
  )
}

export function AttentionQueue({ alerts, newsItems }: Props) {
  const [showAll, setShowAll] = useState(false)
  const items = buildItems(alerts, newsItems)
  const visibleItems = showAll ? items : items.slice(0, 5)
  const hasMore = items.length > 5

  const criticalCount = items.filter(i => i.priority === 'critical').length
  const highCount     = items.filter(i => i.priority === 'high').length

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#111111', border: '1px solid #242424' }}>
      <div
        className="flex items-center justify-between"
        style={{ padding: '14px 20px', borderBottom: '1px solid #242424' }}
      >
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.13em', color: '#4A4A4A' }}>
          מה דורש תשומת לב
        </p>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span style={{ background: 'rgba(255,90,90,0.12)', color: '#FF5A5A', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
              {criticalCount} קריטי
            </span>
          )}
          {highCount > 0 && (
            <span style={{ background: 'rgba(245,166,35,0.12)', color: '#F5A623', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
              {highCount} לבדיקה
            </span>
          )}
          {items.length === 0 && (
            <span style={{ fontSize: 12, fontWeight: 600, color: '#00DC82' }}>הכל תקין</span>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: '40px 24px', textAlign: 'center' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(0,220,130,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00DC82" strokeWidth="2.5" strokeLinecap="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF', marginBottom: 4 }}>אין סיגנלים פעילים</p>
          <p style={{ fontSize: 12, color: '#4A4A4A' }}>התיק פועל כצפוי</p>
        </div>
      ) : (
        <div>
          {visibleItems.map((item, idx) => (
            <AttentionCard key={item.id} item={item} isLast={!hasMore && idx === visibleItems.length - 1} />
          ))}
          {hasMore && (
            <button
              onClick={() => setShowAll(s => !s)}
              className="w-full transition-colors hover:text-white"
              style={{ padding: '12px 20px', fontSize: 12, fontWeight: 500, color: '#4A4A4A', borderTop: '1px solid #1a1a1a', textAlign: 'center' }}
            >
              {showAll ? 'הצג פחות' : `עוד ${items.length - 5} פריטים →`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
