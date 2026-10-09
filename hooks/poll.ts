import type { Limit } from '../types'

// The account's limits as /usage and Claude's settings page read them. The
// response headers only move when this session calls the model, so spending
// elsewhere (another window, claude.ai) shows up here only through this.
export const USAGE_URL = 'https://api.anthropic.com/api/oauth/usage'

const WINDOWS = ['five_hour', 'seven_day'] as const

type Window = { utilization?: number | null; resets_at?: string | null } | null

export function parseUsage(text: string): Limit[] | null {
  let body: Record<string, Window>
  try {
    body = JSON.parse(text)
  } catch {
    return null
  }
  const limits: Limit[] = []
  for (const kind of WINDOWS) {
    const w = body[kind]
    if (w && typeof w.utilization === 'number') {
      limits.push({ kind, percentUsed: w.utilization, ...(w.resets_at ? { resetsAt: w.resets_at } : {}) })
    }
  }
  return limits.length > 0 ? limits : null
}

export type PollOutcome = { limits: Limit[] } | { skip: 'no-login' | 'failed' | 'throttled' }
