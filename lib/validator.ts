import type { ScoredNews } from './scorer'
import type { PerplexityResult } from './perplexity'

// ─── Public types ─────────────────────────────────────────────────────────────

export type FlagType =
  | 'date_sanity'
  | 'unknown_ticker'
  | 'number_inconsistency'
  | 'confidence_floor'
  | 'source_quality'

export interface ValidationFlag {
  type:      FlagType
  severity:  'warning' | 'error'
  message:   string
  detail?:   string
}

export interface ValidationInput {
  scored:       ScoredNews
  perplexity:   PerplexityResult
  /** All tickers currently in holdings + watchlist */
  knownTickers: string[]
}

export interface ValidationOutput {
  flags:               ValidationFlag[]
  /** Routing — may be downgraded by confidence floor */
  routing:             ScoredNews['routing']
  /** Importance — may be capped by source quality */
  importance_score:    number
  /** True when a date-sanity issue was detected */
  confidence_override: boolean
  /** Hebrew warning appended to summary when issues found */
  hebrew_warning?:     string
}

// ─── Source tiers ─────────────────────────────────────────────────────────────

const TIER1_PATTERNS = [
  'sec.gov', 'investor.', 'investors.', '/ir/', '/ir.', 'earnings',
  '8-k', '10-k', '10-q', 'press-release', 'newsroom',
]

const TIER2_PATTERNS = [
  'reuters.com', 'cnbc.com', 'bloomberg.com', 'marketwatch.com',
  'finance.yahoo.com', 'nasdaq.com', 'barrons.com', 'wsj.com',
  'ft.com', 'thestreet.com', 'seekingalpha.com', 'benzinga.com',
  'public.com/stocks',
]

function classifySource(url: string): 1 | 2 | 3 {
  const u = url.toLowerCase()
  if (TIER1_PATTERNS.some(p => u.includes(p))) return 1
  if (TIER2_PATTERNS.some(p => u.includes(p))) return 2
  return 3
}

// ─── Ticker stop list (common abbreviations, not tickers) ────────────────────

const TICKER_STOPLIST = new Set([
  'AI', 'US', 'CEO', 'CTO', 'CFO', 'COO', 'CIO', 'EPS', 'YTD', 'ETF',
  'IPO', 'SEC', 'FY', 'Q1', 'Q2', 'Q3', 'Q4', 'OK', 'IR', 'EU', 'UK',
  'UN', 'OR', 'AT', 'ON', 'BE', 'BY', 'IS', 'IN', 'OF', 'TO', 'DO', 'SO',
  'IT', 'IF', 'AN', 'PE', 'VC', 'ML', 'PC', 'TV', 'AM', 'PM', 'GPU', 'CPU',
  'API', 'SDK', 'LLC', 'INC', 'LTD', 'SML', 'RTL', 'YOY', 'QOQ', 'EV',
  'AR', 'VR', 'MR', 'MS', 'DR', 'PR', 'HR', 'ID', 'IT', 'NO', 'UP', 'TD',
  'AWS', 'GCP', 'ADC', 'GCP', 'USD', 'ILS', 'EUR', 'HPC', 'HFT', 'OTC',
  'RPM', 'FTE', 'KPI', 'ROI', 'ROE', 'YOE', 'NDA', 'MOU', 'IOT', 'LLM',
  'NVDA',  // known ticker — don't flag as unknown when testing
])

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extract 4-digit year-like integers from text */
function extractYears(text: string): number[] {
  const matches = text.match(/\b(20\d{2}|19\d{2})\b/g) ?? []
  return [...new Set(matches.map(Number))]
}

/** Extract numeric values (integers + decimals) from text, returns normalised strings */
function extractNumbers(text: string): string[] {
  const matches = text.match(/\b\d{1,3}(?:,\d{3})*(?:\.\d+)?|\b\d+(?:\.\d+)?\b/g) ?? []
  // Normalise: strip commas, keep significant digits
  return [...new Set(matches.map(s => s.replace(/,/g, '')))]
}

/** Ticker-like all-caps tokens (3-5 chars) not in the stop list */
function extractTickers(text: string): string[] {
  const matches = text.match(/\b[A-Z]{2,5}\b/g) ?? []
  return [...new Set(matches.filter(t => !TICKER_STOPLIST.has(t)))]
}

// ─── Individual checks ────────────────────────────────────────────────────────

function checkDates(hebrewSummary: string): ValidationFlag[] {
  const flags: ValidationFlag[] = []
  const currentYear = new Date().getFullYear()

  for (const year of extractYears(hebrewSummary)) {
    if (year > currentYear) {
      flags.push({
        type:     'date_sanity',
        severity: 'warning',
        message:  'תאריך חשוד — דורש בדיקה',
        detail:   `שנה ${year} הוזכרה בתקציר העברי אך היא בעתיד (שנה נוכחית: ${currentYear})`,
      })
    } else if (year < 2020) {
      flags.push({
        type:     'date_sanity',
        severity: 'warning',
        message:  'תאריך חשוד — דורש בדיקה',
        detail:   `שנה ${year} מוקדמת מ-2020 — ייתכן שמדובר במידע ישן או שגיאה`,
      })
    }
  }

  return flags
}

function checkTickers(
  hebrewSummary: string,
  rawSummary: string,
  knownTickers: string[]
): ValidationFlag[] {
  const flags: ValidationFlag[] = []
  const known = new Set(knownTickers.map(t => t.toUpperCase()))

  const candidates = [
    ...extractTickers(hebrewSummary),
    ...extractTickers(rawSummary),
  ]

  for (const ticker of candidates) {
    if (!known.has(ticker)) {
      flags.push({
        type:     'unknown_ticker',
        severity: 'warning',
        message:  `טיקר לא מוכר: ${ticker}`,
        detail:   `"${ticker}" הוזכר אך אינו בתיק ההשקעות או ברשימת המעקב`,
      })
    }
  }

  return flags
}

function checkNumbers(hebrewSummary: string, rawOutput: string): ValidationFlag[] {
  const flags: ValidationFlag[] = []
  if (!hebrewSummary || !rawOutput) return flags

  const hebrewNums = extractNumbers(hebrewSummary)
  // Ignore single-digit and two-digit numbers — too common (years, percentages under 100, etc.)
  const significant = hebrewNums.filter(n => n.replace('.', '').length >= 3)

  for (const num of significant) {
    if (!rawOutput.includes(num)) {
      flags.push({
        type:     'number_inconsistency',
        severity: 'warning',
        message:  `מספר "${num}" בתקציר העברי לא נמצא במקור — ייתכן הזיה`,
        detail:   `המספר ${num} הופיע בתקציר העברי אך אינו מופיע בפלט גולמי של Perplexity`,
      })
    }
  }

  return flags
}

function applyConfidenceFloor(
  routing: ScoredNews['routing'],
  confidence: number
): { routing: ScoredNews['routing']; flag: ValidationFlag | null } {
  if (confidence < 4 && (routing === 'immediate' || routing === 'daily')) {
    return {
      routing: 'weekly',
      flag: {
        type:     'confidence_floor',
        severity: 'warning',
        message:  `ניתוב הורד ל-"weekly" (confidence ${confidence}/10 < 4)`,
        detail:   `ניתוב מקורי: "${routing}" — רמת ביטחון נמוכה מדי לניתוב גבוה`,
      },
    }
  }
  if (confidence < 6 && routing === 'immediate') {
    return {
      routing: 'daily',
      flag: {
        type:     'confidence_floor',
        severity: 'warning',
        message:  `ניתוב הורד ל-"daily" (confidence ${confidence}/10 < 6)`,
        detail:   `ניתוב מקורי: "immediate" — רמת ביטחון לא מספיקה ל-immediate`,
      },
    }
  }
  return { routing, flag: null }
}

function checkSourceQuality(
  sources: string[],
  importance: number
): { importance: number; flag: ValidationFlag | null } {
  if (sources.length === 0) return { importance, flag: null }

  const tiers = sources.map(classifySource)
  const allTier3 = tiers.every(t => t === 3)
  const bestTier = Math.min(...tiers) as 1 | 2 | 3

  if (allTier3 && importance > 6) {
    return {
      importance: 6,
      flag: {
        type:     'source_quality',
        severity: 'warning',
        message:  `importance_score הוגבל ל-6 (כל המקורות Tier 3)`,
        detail:   `מקורות: ${sources.slice(0, 3).join(', ')} — אין מקורות ראשוניים או פיננסיים מהימנים`,
      },
    }
  }

  return { importance, flag: null }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function validate(input: ValidationInput): ValidationOutput {
  const { scored, perplexity, knownTickers } = input
  const flags: ValidationFlag[] = []

  // 1. Date sanity — Hebrew summary only (translator hallucinations)
  flags.push(...checkDates(scored.hebrew_summary))

  // 2. Ticker sanity — Hebrew summary + Perplexity plain summary
  flags.push(...checkTickers(scored.hebrew_summary, perplexity.summary, knownTickers))

  // 3. Number consistency — Hebrew vs raw Perplexity JSON
  flags.push(...checkNumbers(scored.hebrew_summary, perplexity.raw))

  // 4. Confidence floor — may downgrade routing
  const { routing, flag: cfFlag } = applyConfidenceFloor(scored.routing, scored.confidence_score)
  if (cfFlag) flags.push(cfFlag)

  // 5. Source quality — may cap importance
  const { importance: importance_score, flag: sqFlag } = checkSourceQuality(
    perplexity.sources,
    scored.importance_score
  )
  if (sqFlag) flags.push(sqFlag)

  const confidence_override = flags.some(f => f.type === 'date_sanity')
  const hebrew_warning = confidence_override ? 'תאריך חשוד — דורש בדיקה' : undefined

  return { flags, routing, importance_score, confidence_override, hebrew_warning }
}
