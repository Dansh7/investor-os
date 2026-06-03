'use client'

export type MainView =
  | 'overview' | 'holdings' | 'earnings' | 'intelligence'
  | 'thesis' | 'risk' | 'events' | 'watchlist' | 'policy'

interface Props {
  mainView: MainView
  setMainView: (v: MainView) => void
}

const NAV: { id: MainView; label: string }[] = [
  { id: 'overview',     label: 'Dashboard' },
  { id: 'holdings',     label: 'Portfolio' },
  { id: 'watchlist',    label: 'Watchlist' },
  { id: 'intelligence', label: 'News & Insights' },
  { id: 'earnings',     label: 'Earnings' },
  { id: 'events',       label: 'Calendar' },
  { id: 'risk',         label: 'Alerts' },
  { id: 'policy',       label: 'Reports' },
]

export function AppNavbar({ mainView, setMainView }: Props) {
  return (
    <div style={{
      height: 52, minHeight: 52, flexShrink: 0,
      background: '#0a0a0f', borderBottom: '1px solid #1a1a28',
      display: 'flex', alignItems: 'center', paddingInline: 20, gap: 6,
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginInlineEnd: 20, flexShrink: 0 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 7, flexShrink: 0,
          background: 'linear-gradient(135deg, #00d4a8, #0066ff)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <span style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontWeight: 700, fontSize: 14, color: '#fff', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
          Investor <span style={{ color: '#00d4a8' }}>OS</span>
        </span>
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, overflow: 'hidden' }}>
        {NAV.map(item => {
          const active = mainView === item.id
          return (
            <button key={item.id} onClick={() => setMainView(item.id)} style={{
              padding: '5px 13px', borderRadius: 7, cursor: 'pointer',
              fontSize: 13, fontFamily: 'var(--font-dm-sans), sans-serif',
              fontWeight: active ? 600 : 400,
              color: active ? '#fff' : '#555',
              background: active ? '#16162a' : 'transparent',
              border: `1px solid ${active ? '#2a2a4a' : 'transparent'}`,
              transition: 'all 0.1s', whiteSpace: 'nowrap',
            }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#aaa' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#555' }}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#111118', border: '1px solid #1a1a28', borderRadius: 8, padding: '5px 10px', cursor: 'text' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
          <span style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 12, color: '#444' }}>Search anything...</span>
          <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: 10, color: '#333', background: '#1a1a28', padding: '1px 5px', borderRadius: 4 }}>⌘K</span>
        </div>

        {/* Bell */}
        <button style={{ width: 32, height: 32, borderRadius: 7, background: '#111118', border: '1px solid #1a1a28', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
          <span style={{ position: 'absolute', top: 7, right: 7, width: 5, height: 5, borderRadius: '50%', background: '#00d4a8' }} />
        </button>

        {/* Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px 4px 4px', background: '#111118', border: '1px solid #1a1a28', borderRadius: 8, cursor: 'pointer' }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: 'linear-gradient(135deg, #00d4a8, #0066ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'var(--font-dm-sans), sans-serif', color: '#fff', fontSize: 9, fontWeight: 700 }}>CIO</span>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 11, color: '#ccc', fontWeight: 600, lineHeight: 1.2 }}>CIO</div>
            <div style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 10, color: '#00d4a8', lineHeight: 1.2 }}>Active</div>
          </div>
        </div>
      </div>
    </div>
  )
}
