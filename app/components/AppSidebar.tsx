'use client'

import { useState } from 'react'
import type { MainView } from './AppNavbar'

interface PD { current_price: number | null; change_percent: number | null; change: number | null }

interface Props {
  mainView:    MainView
  setMainView: (v: MainView) => void
  nasdaq?:     PD | null
}

// ─── Tabler-style icons ───────────────────────────────────────────────────────

function Icon({ name }: { name: string }) {
  const s = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none' as const, stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (name) {
    case 'grid':       return <svg {...s}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
    case 'briefcase':  return <svg {...s}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
    case 'trending':   return <svg {...s}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
    case 'bar':        return <svg {...s}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
    case 'swap':       return <svg {...s}><path d="m4 6 4-4 4 4"/><path d="M8 2v10.3"/><path d="m20 18-4 4-4-4"/><path d="M16 22V11.7"/></svg>
    case 'star':       return <svg {...s}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
    case 'newspaper':  return <svg {...s}><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 0-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>
    case 'dollar':     return <svg {...s}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
    case 'calendar':   return <svg {...s}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    case 'bell':       return <svg {...s}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
    case 'file':       return <svg {...s}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
    case 'settings':   return <svg {...s}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
    default:           return <svg {...s}><circle cx="12" cy="12" r="10"/></svg>
  }
}

// ─── Nav items ────────────────────────────────────────────────────────────────

const ITEMS: { id: MainView; label: string; icon: string }[] = [
  { id: 'overview',     label: 'Overview',       icon: 'grid' },
  { id: 'holdings',     label: 'Holdings',        icon: 'briefcase' },
  { id: 'thesis',       label: 'Performance',     icon: 'trending' },
  { id: 'thesis',       label: 'Analytics',       icon: 'bar' },
  { id: 'holdings',     label: 'Transactions',    icon: 'swap' },
  { id: 'watchlist',    label: 'Watchlist',       icon: 'star' },
  { id: 'intelligence', label: 'News & Insights', icon: 'newspaper' },
  { id: 'earnings',     label: 'Earnings',        icon: 'dollar' },
  { id: 'events',       label: 'Calendar',        icon: 'calendar' },
  { id: 'risk',         label: 'Alerts',          icon: 'bell' },
  { id: 'policy',       label: 'Reports',         icon: 'file' },
  { id: 'policy',       label: 'Settings',        icon: 'settings' },
]

export function AppSidebar({ mainView, setMainView, nasdaq }: Props) {
  const [darkMode, setDarkMode] = useState(true)
  const up = (nasdaq?.change_percent ?? 0) >= 0

  return (
    <div style={{
      width: 200, minWidth: 200, flexShrink: 0,
      background: '#0d0d14', borderRight: '1px solid #1a1a28',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto', overflowX: 'hidden',
    }}>
      {/* Nav items */}
      <nav style={{ flex: 1, padding: '10px 8px' }}>
        {ITEMS.map((item, i) => {
          const active = mainView === item.id && (
            item.label === 'Overview'       ? mainView === 'overview' :
            item.label === 'Holdings'       ? mainView === 'holdings' :
            item.label === 'Watchlist'      ? mainView === 'watchlist' :
            item.label === 'News & Insights'? mainView === 'intelligence' :
            item.label === 'Earnings'       ? mainView === 'earnings' :
            item.label === 'Calendar'       ? mainView === 'events' :
            item.label === 'Alerts'         ? mainView === 'risk' :
            item.label === 'Reports'        ? mainView === 'policy' :
            item.label === 'Performance'    ? mainView === 'thesis' :
            false
          )

          return (
            <button
              key={`${item.label}-${i}`}
              onClick={() => setMainView(item.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                fontFamily: 'var(--font-dm-sans), sans-serif',
                fontSize: 13, fontWeight: active ? 600 : 400,
                color: active ? '#fff' : '#555',
                background: active ? 'rgba(0,212,168,0.07)' : 'transparent',
                borderLeft: `2px solid ${active ? '#00d4a8' : 'transparent'}`,
                marginBottom: 1,
                transition: 'all 0.1s',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.color = '#aaa'; e.currentTarget.style.background = '#111118' } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.color = '#555'; e.currentTarget.style.background = 'transparent' } }}
            >
              <span style={{ color: active ? '#00d4a8' : 'inherit', flexShrink: 0 }}>
                <Icon name={item.icon} />
              </span>
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* NASDAQ widget */}
      <div style={{ borderTop: '1px solid #1a1a28', padding: '14px 14px 10px' }}>
        <div style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 10, color: '#444', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
          NASDAQ
        </div>
        {nasdaq?.current_price ? (
          <>
            <div style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: 16, fontWeight: 600, color: '#e0e0e0', lineHeight: 1.2, marginBottom: 3 }}>
              {nasdaq.current_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: 12, color: up ? '#00d4a8' : '#ff4d6d', display: 'flex', alignItems: 'center', gap: 4 }}>
              {up ? '+' : ''}{nasdaq.change_percent?.toFixed(2)}%
              <span style={{ fontSize: 10, color: '#1f3a2a', marginLeft: 4 }}>● Open</span>
            </div>
          </>
        ) : (
          <div style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: 14, color: '#333' }}>—</div>
        )}

        {/* Dark mode toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: '1px solid #1a1a28' }}>
          <span style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 12, color: '#555' }}>Dark Mode</span>
          <button
            onClick={() => setDarkMode(d => !d)}
            style={{
              width: 32, height: 18, borderRadius: 9,
              background: darkMode ? '#00d4a8' : '#2a2a3a',
              border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
            }}
          >
            <span style={{
              position: 'absolute', top: 3, left: darkMode ? 16 : 3,
              width: 12, height: 12, borderRadius: '50%', background: '#fff',
              transition: 'left 0.2s',
            }} />
          </button>
        </div>

        {/* Data timestamp */}
        <div style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 10, color: '#2a2a3a', marginTop: 10 }}>
          Data as of {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}
