export type ActionType = 'immediate' | 'daily' | 'weekly' | 'discard' | 'historical'

export function computeActionType(
  imp: number,
  impact: number,
  urgency: number,
  thesis: string
): ActionType {
  if (thesis === 'breaking') return 'immediate'
  if (impact >= 8) return 'immediate'
  if (urgency >= 8 && imp >= 7) return 'immediate'
  if (thesis === 'weakening') return 'daily'
  if (impact >= 6) return 'daily'
  if (urgency >= 6 && imp >= 5) return 'daily'
  if (imp >= 8) return 'daily'
  if (Math.max(imp, impact, urgency) >= 3) return 'weekly'
  return 'discard'
}
