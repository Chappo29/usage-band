import type { Limit, Snapshot } from '../types'

export type Level = 'ok' | 'warn' | 'low'
export type Part = {
  key: string
  label: string
  // the figure shown and the gauge's fill, 0..100: what is used, of the
  // context and of each limit (as Claude's usage page shows it); absent
  // before the first response
  value?: number
  caption: string
  level: Level
}

const LABELS: Record<string, string> = {
  five_hour: '5 часов · исп.',
  seven_day: 'неделя · исп.',
  spend_limit: 'бюджет · исп.',
}

export function level(left: number): Level {
  if (left <= 10) return 'low'
  if (left <= 30) return 'warn'
  return 'ok'
}

export function tokens(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${Math.round(n / 1000)}k`
  return String(n)
}

export function countdown(resetsAt: string | undefined, now: number): string {
  if (!resetsAt) return ''
  const ms = Date.parse(resetsAt) - now
  if (!Number.isFinite(ms)) return ''
  if (ms <= 0) return 'сброс сейчас'
  const min = Math.ceil(ms / 60_000)
  const d = Math.floor(min / 1440)
  const h = Math.floor((min % 1440) / 60)
  const m = min % 60
  return `сброс через ${d > 0 ? `${d}д ${h}ч` : h > 0 ? `${h}ч ${m}м` : `${m}м`}`
}

export function contextPart(s: Snapshot): Part {
  const window = `окно ${tokens(s.ctxWindow)}`
  if (s.ctxPercent === undefined) {
    return { key: 'context', label: 'контекст · исп.', caption: window, level: 'ok' }
  }
  const used = Math.min(100, Math.max(0, s.ctxPercent))
  const caption = s.ctxTokens === undefined ? window : `${tokens(s.ctxTokens)} из ${tokens(s.ctxWindow)}`
  return { key: 'context', label: 'контекст · исп.', value: used, caption, level: level(100 - used) }
}

export function limitPart(l: Limit, now: number): Part {
  // rounded up, as Claude's usage page rounds it: 51.4 used reads 52%
  const used = Math.min(100, Math.ceil(l.percentUsed))
  return { key: l.kind, label: LABELS[l.kind] ?? `${l.kind} · исп.`, value: used, caption: countdown(l.resetsAt, now), level: level(100 - used) }
}

export function parts(s: Snapshot, now: number): Part[] {
  return [contextPart(s), ...s.limits.map(l => limitPart(l, now))]
}

export function describe(ps: Part[]): string {
  const each = ps.map(p => {
    const name = p.label.replace(' · исп.', '')
    return `${name}: использовано ${p.value ?? '—'}%${p.caption ? ` (${p.caption})` : ''}`
  })
  return each.join('; ')
}
