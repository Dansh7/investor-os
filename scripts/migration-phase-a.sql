-- =============================================================
-- Phase A: Data Foundation Migration (revised)
-- Accounts for existing tables: portfolios(INTEGER id), holdings,
-- alerts, briefings, news_items, rules
-- =============================================================

-- ============================================================
-- 1. Extend holdings table (thesis, thesis_break already exist)
-- ============================================================
ALTER TABLE holdings
  ADD COLUMN IF NOT EXISTS thesis_status TEXT DEFAULT 'intact'
    CHECK (thesis_status IN ('intact', 'weakening', 'broken', 'exited')),
  ADD COLUMN IF NOT EXISTS thesis_break_conditions JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS thesis_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS target_allocation_pct NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS max_allocation_pct NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================
-- 2. Extend news_items (id, ticker, headline, summary,
--    importance_score, source_tier, source_url, thesis_impact,
--    alert_sent, fetched_at already exist)
-- ============================================================
ALTER TABLE news_items
  ADD COLUMN IF NOT EXISTS portfolio_impact_score NUMERIC(4,2) CHECK (portfolio_impact_score BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral', 'mixed')),
  ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS raw_content TEXT,
  ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source TEXT;

CREATE INDEX IF NOT EXISTS idx_news_items_ticker     ON news_items(ticker);
CREATE INDEX IF NOT EXISTS idx_news_items_fetched_at ON news_items(fetched_at);
CREATE INDEX IF NOT EXISTS idx_news_items_importance ON news_items(importance_score);

-- ============================================================
-- 3. Extend alerts (add new lifecycle columns to existing table)
-- ============================================================
ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS body TEXT,
  ADD COLUMN IF NOT EXISTS alert_status TEXT DEFAULT 'active'
    CHECK (alert_status IN ('active', 'acknowledged', 'dismissed', 'resolved')),
  ADD COLUMN IF NOT EXISTS priority SMALLINT DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS source_news_id UUID REFERENCES news_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS triggered_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_alerts_portfolio ON alerts(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status    ON alerts(alert_status);
CREATE INDEX IF NOT EXISTS idx_alerts_triggered ON alerts(triggered_at);

-- ============================================================
-- 4. Extend briefings (add new columns to existing table)
-- ============================================================
ALTER TABLE briefings
  ADD COLUMN IF NOT EXISTS portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS briefing_type TEXT DEFAULT 'daily'
    CHECK (briefing_type IN ('daily', 'weekly', 'ad_hoc', 'alert')),
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS body TEXT,
  ADD COLUMN IF NOT EXISTS telegram_message_id BIGINT,
  ADD COLUMN IF NOT EXISTS decision_queue JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS briefing_metadata JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_briefings_portfolio ON briefings(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_briefings_sent_at   ON briefings(sent_at);

-- ============================================================
-- 5. portfolio_policy  (HOW to manage — rules)
-- ============================================================
CREATE TABLE IF NOT EXISTS portfolio_policy (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id            INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  max_single_position_pct NUMERIC(5,2) DEFAULT 20,
  max_sector_pct          NUMERIC(5,2) DEFAULT 40,
  min_cash_pct            NUMERIC(5,2) DEFAULT 5,
  rebalance_trigger_pct   NUMERIC(5,2) DEFAULT 5,
  stop_loss_pct           NUMERIC(5,2),
  max_drawdown_pct        NUMERIC(5,2),
  rules                   JSONB DEFAULT '[]',
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (portfolio_id)
);

-- ============================================================
-- 6. portfolio_objectives  (WHY — goals)
-- ============================================================
CREATE TABLE IF NOT EXISTS portfolio_objectives (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id             INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  primary_goal             TEXT,
  time_horizon             TEXT,
  target_annual_return_pct NUMERIC(5,2),
  risk_tolerance           TEXT DEFAULT 'moderate'
    CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive')),
  benchmark_ticker         TEXT,
  liquidity_needs          TEXT,
  tax_considerations       TEXT,
  constraints              JSONB DEFAULT '[]',
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (portfolio_id)
);

-- ============================================================
-- 7. watchlist
-- ============================================================
CREATE TABLE IF NOT EXISTS watchlist (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id       INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  ticker             TEXT NOT NULL,
  company_name       TEXT,
  reason             TEXT,
  target_entry_price NUMERIC(12,4),
  thesis             TEXT,
  conviction_score   SMALLINT CHECK (conviction_score BETWEEN 1 AND 10),
  tags               JSONB DEFAULT '[]',
  added_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (portfolio_id, ticker)
);

-- ============================================================
-- 8. playbook_rules
-- ============================================================
CREATE TABLE IF NOT EXISTS playbook_rules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id      INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  rule_name         TEXT NOT NULL,
  trigger_condition TEXT NOT NULL,
  action            TEXT NOT NULL,
  priority          SMALLINT DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  is_active         BOOLEAN DEFAULT TRUE,
  applies_to        JSONB DEFAULT '[]',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. technical_signals
-- ============================================================
CREATE TABLE IF NOT EXISTS technical_signals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker           TEXT NOT NULL,
  signal_type      TEXT NOT NULL,
  signal_value     NUMERIC,
  signal_direction TEXT CHECK (signal_direction IN ('bullish', 'bearish', 'neutral')),
  timeframe        TEXT,
  notes            TEXT,
  captured_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_technical_signals_ticker      ON technical_signals(ticker);
CREATE INDEX IF NOT EXISTS idx_technical_signals_captured_at ON technical_signals(captured_at);

-- ============================================================
-- 10. news_clusters  (after news_items — no circular FK)
-- ============================================================
CREATE TABLE IF NOT EXISTS news_clusters (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  headline_hash      TEXT NOT NULL UNIQUE,
  canonical_event_id UUID REFERENCES news_items(id) ON DELETE SET NULL,
  topic              TEXT,
  tickers            JSONB DEFAULT '[]',
  article_count      SMALLINT DEFAULT 1,
  first_seen_at      TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_news_clusters_hash ON news_clusters(headline_hash);

-- Add cluster_id back to news_items
ALTER TABLE news_items
  ADD COLUMN IF NOT EXISTS cluster_id UUID REFERENCES news_clusters(id) ON DELETE SET NULL;

-- ============================================================
-- 11. events
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
  ticker       TEXT,
  event_type   TEXT NOT NULL,
  event_name   TEXT,
  scheduled_at TIMESTAMPTZ,
  notes        TEXT,
  source       TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_ticker       ON events(ticker);
CREATE INDEX IF NOT EXISTS idx_events_scheduled_at ON events(scheduled_at);

-- ============================================================
-- 12. decision_items  (persistent lifecycle across briefings)
-- ============================================================
CREATE TABLE IF NOT EXISTS decision_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id    INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
  briefing_id     UUID REFERENCES briefings(id) ON DELETE SET NULL,
  ticker          TEXT,
  decision_type   TEXT,
  recommendation  TEXT NOT NULL,
  rationale       TEXT,
  decision_status TEXT DEFAULT 'open'
    CHECK (decision_status IN ('open', 'acknowledged', 'completed', 'deferred')),
  priority        SMALLINT DEFAULT 5,
  due_date        DATE,
  completed_at    TIMESTAMPTZ,
  user_notes      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decision_items_portfolio ON decision_items(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_decision_items_status    ON decision_items(decision_status);

-- ============================================================
-- 13. thesis_log
-- ============================================================
CREATE TABLE IF NOT EXISTS thesis_log (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holding_id                UUID NOT NULL REFERENCES holdings(id) ON DELETE CASCADE,
  ticker                    TEXT NOT NULL,
  previous_status           TEXT,
  new_status                TEXT NOT NULL,
  thesis_snapshot           TEXT,
  break_conditions_snapshot JSONB,
  trigger_news_id           UUID REFERENCES news_items(id) ON DELETE SET NULL,
  logged_at                 TIMESTAMPTZ DEFAULT NOW(),
  notes                     TEXT
);

CREATE INDEX IF NOT EXISTS idx_thesis_log_holding ON thesis_log(holding_id);
CREATE INDEX IF NOT EXISTS idx_thesis_log_ticker  ON thesis_log(ticker);

-- ============================================================
-- 14. Row-Level Security
-- ============================================================
ALTER TABLE portfolio_policy     ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist            ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_rules       ENABLE ROW LEVEL SECURITY;
ALTER TABLE technical_signals    ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_clusters        ENABLE ROW LEVEL SECURITY;
ALTER TABLE events               ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE thesis_log           ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Allow public read" ON portfolio_policy     FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON portfolio_objectives FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON watchlist            FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON playbook_rules       FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON technical_signals    FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON news_clusters        FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON events               FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON decision_items       FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON thesis_log           FOR SELECT USING (true);

-- Full write
CREATE POLICY "Allow all write" ON portfolio_policy     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all write" ON portfolio_objectives FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all write" ON watchlist            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all write" ON playbook_rules       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all write" ON technical_signals    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all write" ON news_clusters        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all write" ON events               FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all write" ON decision_items       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all write" ON thesis_log           FOR ALL USING (true) WITH CHECK (true);
