import type { Limit, Snapshot } from '../types'

export type Lang = 'en' | 'ru'
export type Level = 'ok' | 'warn' | 'low'
export type Part = {
  key: string
  // what is measured ("context"); `label` adds that the figure is the used share
  name: string
  label: string
  // the figure shown and the gauge's fill, 0..100: what is used, of the
  // context and of each limit (as Claude's usage page shows it); absent
  // before the first response
  value?: number
  caption: string
  level: Level
}

const WORDS = {
  en: {
    context: 'context',
    five_hour: '5 hours',
    seven_day: 'week',
    spend_limit: 'budget',
    usedTag: 'used',
    used: 'used',
    of: 'of',
    window: 'window',
    resetIn: 'resets in',
    resetNow: 'resets now',
    d: 'd',
    h: 'h',
    m: 'm',
  },
  ru: {
    context: 'контекст',
    five_hour: '5 часов',
    seven_day: 'неделя',
    spend_limit: 'бюджет',
    usedTag: 'исп.',
    used: 'использовано',
    of: 'из',
    window: 'окно',
    resetIn: 'сброс через',
    resetNow: 'сброс сейчас',
    d: 'д',
    h: 'ч',
    m: 'м',
  },
} as const

export function lang(value: unknown): Lang {
  return value === 'ru' ? 'ru' : 'en'
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

export function countdown(resetsAt: string | undefined, now: number, l: Lang = 'en'): string {
  if (!resetsAt) return ''
  const ms = Date.parse(resetsAt) - now
  if (!Number.isFinite(ms)) return ''
  const w = WORDS[l]
  if (ms <= 0) return w.resetNow
  const min = Math.ceil(ms / 60_000)
  const d = Math.floor(min / 1440)
  const h = Math.floor((min % 1440) / 60)
  const m = min % 60
  const span = d > 0 ? `${d}${w.d} ${h}${w.h}` : h > 0 ? `${h}${w.h} ${m}${w.m}` : `${m}${w.m}`
  return `${w.resetIn} ${span}`
}

function named(key: string, name: string, l: Lang) {
  return { key, name, label: `${name} · ${WORDS[l].usedTag}` }
}

export function contextPart(s: Snapshot, l: Lang = 'en'): Part {
  const w = WORDS[l]
  const window = `${w.window} ${tokens(s.ctxWindow)}`
  if (s.ctxPercent === undefined) {
    return { ...named('context', w.context, l), caption: window, level: 'ok' }
  }
  const used = Math.min(100, Math.max(0, s.ctxPercent))
  const caption = s.ctxTokens === undefined ? window : `${tokens(s.ctxTokens)} ${w.of} ${tokens(s.ctxWindow)}`
  return { ...named('context', w.context, l), value: used, caption, level: level(100 - used) }
}

export function limitPart(lim: Limit, now: number, l: Lang = 'en'): Part {
  const w = WORDS[l]
  const name = lim.kind === 'five_hour' || lim.kind === 'seven_day' || lim.kind === 'spend_limit' ? w[lim.kind] : lim.kind
  // rounded up, as Claude's usage page rounds it: 51.4 used reads 52%
  const used = Math.min(100, Math.ceil(lim.percentUsed))
  return { ...named(lim.kind, name, l), value: used, caption: countdown(lim.resetsAt, now, l), level: level(100 - used) }
}

export function parts(s: Snapshot, now: number, l: Lang = 'en'): Part[] {
  return [contextPart(s, l), ...s.limits.map(lim => limitPart(lim, now, l))]
}

export function describe(ps: Part[], l: Lang = 'en'): string {
  const used = WORDS[l].used
  return ps.map(p => `${p.name}: ${used} ${p.value ?? '—'}%${p.caption ? ` (${p.caption})` : ''}`).join('; ')
}
