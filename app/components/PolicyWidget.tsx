'use client'

export interface PolicyRule {
  id: string
  rule_type: string
  description: string
  threshold_value?: number | null
  threshold_pct?: number | null
  action_required?: string | null
  priority?: number | null
  is_active?: boolean | null
}

export interface PolicyObjective {
  id: string
  objective_type: string
  description: string
  target_value?: number | null
  current_value?: number | null
  priority?: number | null
}

interface PolicyRecord {
  max_single_position_pct?: number | null
  max_sector_concentration_pct?: number | null
  min_cash_pct?: number | null
  max_cash_pct?: number | null
  rebalance_frequency?: string | null
}

interface Props {
  policy: PolicyRecord | null
  rules: PolicyRule[]
  objectives: PolicyObjective[]
}

const RULE_TYPE_LABEL: Record<string, string> = {
  position_limit:        'Position Limit',
  sector_concentration:  'Sector Limit',
  cash_floor:            'Cash Floor',
  cash_ceiling:          'Cash Ceiling',
  stop_loss:             'Stop Loss',
  conviction_floor:      'Conviction Floor',
  rebalance_trigger:     'Rebalance',
  drawdown_circuit:      'Drawdown Circuit',
}

const OBJ_TYPE_LABEL: Record<string, string> = {
  annual_return:     'Annual Return Target',
  max_drawdown:      'Max Drawdown',
  sharpe_ratio:      'Sharpe Ratio',
  volatility_target: 'Volatility Target',
  income_yield:      'Income Yield',
}

const SECTION_LABEL_STYLE: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.10em',
  color: '#555',
  marginBottom: 10,
}

export function PolicyWidget({ policy, rules, objectives }: Props) {
  const activeRules = rules.filter(r => r.is_active !== false)
  const sorted = [...activeRules].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
  const sortedObj = [...objectives].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
  const hasData = policy || activeRules.length > 0 || objectives.length > 0

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#111111', border: '1px solid #232323' }}>
      <div className="px-5 py-3.5" style={{ borderBottom: '1px solid #232323' }}>
        <h2 className="text-sm font-semibold text-white">Portfolio Policy</h2>
      </div>

      {!hasData ? (
        <p className="px-5 py-8 text-center text-sm" style={{ color: '#555' }}>No policy defined — run Phase A seed</p>
      ) : (
        <div>
          {policy && (
            <div className="px-5 py-4" style={{ borderBottom: '1px solid #1e1e1e' }}>
              <p style={SECTION_LABEL_STYLE}>Guardrails</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {policy.max_single_position_pct != null && (
                  <>
                    <span style={{ color: '#666' }}>Max position</span>
                    <span className="font-medium tabular-nums text-white">{policy.max_single_position_pct}%</span>
                  </>
                )}
                {policy.max_sector_concentration_pct != null && (
                  <>
                    <span style={{ color: '#666' }}>Max sector</span>
                    <span className="font-medium tabular-nums text-white">{policy.max_sector_concentration_pct}%</span>
                  </>
                )}
                {policy.min_cash_pct != null && (
                  <>
                    <span style={{ color: '#666' }}>Min cash</span>
                    <span className="font-medium tabular-nums text-white">{policy.min_cash_pct}%</span>
                  </>
                )}
                {policy.max_cash_pct != null && (
                  <>
                    <span style={{ color: '#666' }}>Max cash</span>
                    <span className="font-medium tabular-nums text-white">{policy.max_cash_pct}%</span>
                  </>
                )}
                {policy.rebalance_frequency && (
                  <>
                    <span style={{ color: '#666' }}>Rebalance</span>
                    <span className="font-medium text-white">{policy.rebalance_frequency}</span>
                  </>
                )}
              </div>
            </div>
          )}

          {sorted.length > 0 && (
            <div className="px-5 py-4" style={{ borderBottom: sortedObj.length > 0 ? '1px solid #1e1e1e' : 'none' }}>
              <p style={SECTION_LABEL_STYLE}>Playbook Rules</p>
              <div className="space-y-2.5">
                {sorted.map(rule => (
                  <div key={rule.id} className="flex items-start gap-2">
                    <span style={{ color: '#333', marginTop: 2, flexShrink: 0 }}>—</span>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-medium text-white">
                          {RULE_TYPE_LABEL[rule.rule_type] ?? rule.rule_type}
                        </span>
                        {rule.threshold_pct != null && (
                          <span className="text-xs tabular-nums" style={{ color: '#666' }}>{rule.threshold_pct}%</span>
                        )}
                        {rule.threshold_value != null && rule.threshold_pct == null && (
                          <span className="text-xs tabular-nums" style={{ color: '#666' }}>{rule.threshold_value}</span>
                        )}
                      </div>
                      <p className="text-xs leading-snug mt-0.5" style={{ color: '#9a9a9a' }}>{rule.description}</p>
                      {rule.action_required && (
                        <p className="text-xs mt-0.5" style={{ color: '#f5a623' }}>→ {rule.action_required}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sortedObj.length > 0 && (
            <div className="px-5 py-4">
              <p style={SECTION_LABEL_STYLE}>Objectives</p>
              <div className="space-y-2.5">
                {sortedObj.map(obj => (
                  <div key={obj.id} className="flex items-start gap-2">
                    <span style={{ color: '#333', marginTop: 2, flexShrink: 0 }}>—</span>
                    <div>
                      <span className="text-xs font-medium text-white">
                        {OBJ_TYPE_LABEL[obj.objective_type] ?? obj.objective_type}
                        {obj.target_value != null && (
                          <span className="ml-1 font-normal tabular-nums" style={{ color: '#666' }}>
                            {obj.target_value}
                            {['annual_return', 'max_drawdown', 'volatility_target', 'income_yield'].includes(obj.objective_type) ? '%' : ''}
                          </span>
                        )}
                      </span>
                      <p className="text-xs leading-snug mt-0.5" style={{ color: '#9a9a9a' }}>{obj.description}</p>
                    </div>
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
