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

export function PolicyWidget({ policy, rules, objectives }: Props) {
  const activeRules = rules.filter(r => r.is_active !== false)
  const sorted = [...activeRules].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
  const sortedObj = [...objectives].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))

  const hasData = policy || activeRules.length > 0 || objectives.length > 0

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">Portfolio Policy</h2>
      </div>

      {!hasData ? (
        <p className="px-5 py-8 text-center text-sm text-zinc-400">No policy defined — run Phase A seed</p>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {/* Core guardrails */}
          {policy && (
            <div className="px-5 py-4">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Guardrails</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {policy.max_single_position_pct != null && (
                  <>
                    <span className="text-zinc-500 dark:text-zinc-400">Max position</span>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200 tabular-nums">{policy.max_single_position_pct}%</span>
                  </>
                )}
                {policy.max_sector_concentration_pct != null && (
                  <>
                    <span className="text-zinc-500 dark:text-zinc-400">Max sector</span>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200 tabular-nums">{policy.max_sector_concentration_pct}%</span>
                  </>
                )}
                {policy.min_cash_pct != null && (
                  <>
                    <span className="text-zinc-500 dark:text-zinc-400">Min cash</span>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200 tabular-nums">{policy.min_cash_pct}%</span>
                  </>
                )}
                {policy.max_cash_pct != null && (
                  <>
                    <span className="text-zinc-500 dark:text-zinc-400">Max cash</span>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200 tabular-nums">{policy.max_cash_pct}%</span>
                  </>
                )}
                {policy.rebalance_frequency && (
                  <>
                    <span className="text-zinc-500 dark:text-zinc-400">Rebalance</span>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{policy.rebalance_frequency}</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Playbook rules */}
          {sorted.length > 0 && (
            <div className="px-5 py-4">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Playbook Rules</p>
              <div className="space-y-2">
                {sorted.map(rule => (
                  <div key={rule.id} className="flex items-start gap-2">
                    <span className="shrink-0 text-zinc-300 dark:text-zinc-700 mt-0.5">—</span>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          {RULE_TYPE_LABEL[rule.rule_type] ?? rule.rule_type}
                        </span>
                        {rule.threshold_pct != null && (
                          <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">
                            {rule.threshold_pct}%
                          </span>
                        )}
                        {rule.threshold_value != null && rule.threshold_pct == null && (
                          <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">
                            {rule.threshold_value}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-snug">{rule.description}</p>
                      {rule.action_required && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">→ {rule.action_required}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Objectives */}
          {sortedObj.length > 0 && (
            <div className="px-5 py-4">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Objectives</p>
              <div className="space-y-2">
                {sortedObj.map(obj => (
                  <div key={obj.id} className="flex items-start gap-2">
                    <span className="shrink-0 text-zinc-300 dark:text-zinc-700 mt-0.5">—</span>
                    <div>
                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        {OBJ_TYPE_LABEL[obj.objective_type] ?? obj.objective_type}
                        {obj.target_value != null && (
                          <span className="ml-1 font-normal text-zinc-400 dark:text-zinc-500 tabular-nums">
                            {obj.target_value}
                            {['annual_return', 'max_drawdown', 'volatility_target', 'income_yield'].includes(obj.objective_type) ? '%' : ''}
                          </span>
                        )}
                      </span>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-snug">{obj.description}</p>
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
