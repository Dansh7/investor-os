import type { RawArticle } from '../types'

// Item codes that indicate a materially significant filing
const MATERIAL_ITEMS = new Set([
  '1.01', // Entry into Material Definitive Agreement (major contracts, M&A)
  '1.02', // Termination of Material Definitive Agreement
  '1.03', // Bankruptcy or Receivership
  '2.01', // Completion of Acquisition or Disposition
  '2.02', // Results of Operations and Financial Condition (earnings)
  '2.04', // Triggering Events — accelerated financial obligation
  '2.06', // Material Impairments
  '3.01', // Notice of Delisting or Listing Failure
  '4.01', // Changes in Certifying Accountant (auditor change — red flag)
  '4.02', // Non-Reliance on Previously Issued Financial Statements (restatement)
  '5.01', // Changes in Control of Registrant
  '7.01', // Regulation FD Disclosure (often guidance, investor day announcements)
])

// Item codes that are notable but not always material
const NOTABLE_ITEMS = new Set([
  '2.03', // Creation of Direct Financial Obligation (new debt)
  '2.05', // Exit/Disposal Activities (restructuring)
  '3.02', // Unregistered Sales of Equity Securities (dilution)
  '5.02', // Departure/Appointment of Directors or Officers
])

// All others (5.03 amendments, 5.07 shareholder votes, 8.01 other, 9.01 exhibits) → routine

function classifyMateriality(itemsStr: string): 'material' | 'notable' | 'routine' {
  if (!itemsStr) return 'routine'
  const codes = itemsStr.split(',').map(s => s.trim())
  if (codes.some(c => MATERIAL_ITEMS.has(c))) return 'material'
  if (codes.some(c => NOTABLE_ITEMS.has(c))) return 'notable'
  return 'routine'
}

// EDGAR item code → human-readable description
const ITEM_LABELS: Record<string, string> = {
  '1.01': 'Entry into a Material Definitive Agreement',
  '1.02': 'Termination of a Material Definitive Agreement',
  '1.03': 'Bankruptcy or Receivership',
  '2.01': 'Completion of Acquisition or Disposition of Assets',
  '2.02': 'Results of Operations and Financial Condition',
  '2.03': 'Creation of a Direct Financial Obligation',
  '2.04': 'Triggering Events That Accelerate or Increase Financial Obligation',
  '2.05': 'Cost Associated with Exit or Disposal Activities',
  '2.06': 'Material Impairments',
  '3.01': 'Notice of Delisting or Failure to Satisfy Listing Rule',
  '3.02': 'Unregistered Sales of Equity Securities',
  '4.01': 'Changes in Certifying Accountant',
  '4.02': 'Non-Reliance on Previously Issued Financial Statements',
  '5.01': 'Changes in Control of Registrant',
  '5.02': 'Departure/Appointment of Directors or Officers',
  '5.03': 'Amendments to Articles of Incorporation',
  '5.07': 'Submission of Matters to Vote of Security Holders',
  '7.01': 'Regulation FD Disclosure',
  '8.01': 'Other Events',
  '9.01': 'Financial Statements and Exhibits',
}

interface EdgarSubmissions {
  cik: string
  name: string
  tickers: string[]
  filings: {
    recent: {
      form: string[]
      filingDate: string[]
      items: string[]
      primaryDocument: string[]
      accessionNumber: string[]
    }
  }
}

let tickerCikCache: Record<string, number> | null = null

async function resolveTickerToCik(ticker: string): Promise<number | null> {
  if (!tickerCikCache) {
    try {
      const res = await fetch('https://www.sec.gov/files/company_tickers.json', {
        headers: { 'User-Agent': 'investor-os/1.0 contact@example.com' },
      })
      const data = await res.json() as Record<string, { cik_str: number; ticker: string }>
      tickerCikCache = {}
      for (const entry of Object.values(data)) {
        tickerCikCache[entry.ticker.toUpperCase()] = entry.cik_str
      }
    } catch {
      tickerCikCache = {}
    }
  }
  return tickerCikCache[ticker.toUpperCase()] ?? null
}

function buildHeadline(ticker: string, items: string, filingDate: string): string {
  if (!items) return `${ticker} 8-K — Current Report (${filingDate})`

  const codes = items.split(',').map(s => s.trim())
  const labels = codes
    .map(c => ITEM_LABELS[c])
    .filter(Boolean)
    .slice(0, 2)

  if (!labels.length) return `${ticker} 8-K — Item ${items} (${filingDate})`
  return `${ticker} 8-K: ${labels.join(' / ')} (${filingDate})`
}

function buildSummary(ticker: string, items: string, filingDate: string, companyName: string): string {
  if (!items) return `${companyName} filed an 8-K current report with the SEC on ${filingDate}.`

  const codes = items.split(',').map(s => s.trim())
  const labels = codes.map(c => ITEM_LABELS[c] ?? `Item ${c}`).join('; ')
  return `${companyName} (${ticker}) filed an 8-K with the SEC on ${filingDate} covering: ${labels}.`
}

export async function fetchEdgarFilings(
  ticker: string,
  opts: { count?: number; companyName?: string } = {}
): Promise<RawArticle[]> {
  const count = opts.count ?? 5
  const companyName = opts.companyName ?? ticker

  const cik = await resolveTickerToCik(ticker)
  if (!cik) {
    console.warn(`  [EDGAR] No CIK found for ${ticker}`)
    return []
  }

  const paddedCik = String(cik).padStart(10, '0')
  const url = `https://data.sec.gov/submissions/CIK${paddedCik}.json`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'investor-os/1.0 contact@example.com' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data = await res.json() as EdgarSubmissions
    const { form, filingDate, items, accessionNumber } = data.filings.recent

    const articles: RawArticle[] = []

    for (let i = 0; i < form.length && articles.length < count; i++) {
      if (form[i] !== '8-K') continue

      const accNum = accessionNumber[i].replace(/-/g, '')
      const fileUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=8-K&dateb=&owner=include&count=1`
      const directUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accNum}/`

      const materiality = classifyMateriality(items[i])
      articles.push({
        ticker,
        headline: buildHeadline(ticker, items[i], filingDate[i]),
        summary: buildSummary(ticker, items[i], filingDate[i], companyName),
        source: 'SEC EDGAR',
        source_url: directUrl,
        source_tier: 1,
        published_at: new Date(filingDate[i]),
        raw_content: `${ticker} 8-K filed ${filingDate[i]}. Items: ${items[i] || 'unspecified'}. Accession: ${accessionNumber[i]}`,
        filing_materiality: materiality,
      })
    }

    await new Promise(r => setTimeout(r, 200))
    return articles
  } catch (err) {
    console.warn(`  [EDGAR] ${ticker}: ${(err as Error).message}`)
    return []
  }
}
