import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionUsage } from 'claude-code'

import type { Snapshot } from '../types'
import { svg } from './draw'
import { describe, parts } from './format'
import type { Part } from './format'
import { parseUsage, USAGE_URL } from './poll'
import type { PollOutcome } from './poll'

const snap = atom({ plugin: 'usage-band', key: 'snap' } as const, null)
const now = atom({ plugin: 'usage-band', key: 'now' } as const, 0)

const BAR = 10
const POLL_MS = 60_000

function toSnapshot(u: Pick<SessionUsage, 'context' | 'rateLimits'>, prev: Snapshot | null): Snapshot {
  const limits = u.rateLimits.map(l => ({ kind: l.kind, percentUsed: l.percentUsed, resetsAt: l.resetsAt }))
  return {
    ctxPercent: u.context.percent,
    ctxTokens: u.context.tokens,
    ctxWindow: u.context.window,
    // a measurement with no reading keeps what the poll brought
    limits: limits.length > 0 ? limits : (prev?.limits ?? []),
  }
}

async function tick($: EngineInterface) {
  const t = await $.clock.now()
  await update($, now, () => t)
}

async function refresh($: EngineInterface, u: Pick<SessionUsage, 'context' | 'rateLimits'>) {
  await update($, snap, prev => toSnapshot(u, prev))
  await tick($)
}

async function fetchLimits($: EngineInterface): Promise<PollOutcome> {
  const auth = await $.session.authorize()
  if (auth === null) return { skip: 'no-login' }
  try {
    const r = await $.http.fetch(USAGE_URL, {
      auth: auth.handle,
      headers: { 'anthropic-beta': 'oauth-2025-04-20' },
    })
    if (r.status === 429) return { skip: 'throttled' }
    const limits = r.ok ? parseUsage(r.text) : null
    return limits ? { limits } : { skip: 'failed' }
  } catch {
    return { skip: 'failed' }
  }
}

async function poll($: EngineInterface): Promise<PollOutcome> {
  const outcome = await fetchLimits($)
  if ('limits' in outcome) {
    const { limits } = outcome
    await update($, snap, prev => prev && { ...prev, limits })
    await tick($)
  }
  return outcome
}

function bar(fill: number | undefined): [string, string] {
  const lit = fill === undefined ? 0 : Math.round((fill / 100) * BAR)
  return ['▰'.repeat(lit), '▱'.repeat(BAR - lit)]
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await refresh($, await $.session.usage())
    void poll($)
    // every minute: the account's limits from /usage, and the reset countdowns
    let pause = 0
    $.clock.every(POLL_MS, async () => {
      if (pause > 0) {
        pause -= 1
        return tick($)
      }
      const outcome = await poll($)
      if ('skip' in outcome) {
        // throttled: wait five minutes; no Claude login: nothing to ask for
        pause = outcome.skip === 'throttled' ? 4 : outcome.skip === 'no-login' ? Infinity : 0
        await tick($)
      }
    })
    return result
  })

  on('session.measure', async ($, e, next) => {
    await refresh($, e)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const s = await read($, snap)
    if (e.props.hasSurvey || s === null) {
      return next(e)
    }

    const ps = parts(s, (await read($, now)) || (await $.clock.now()))

    // desktop draws an SVG: its own type and the gauge as ticks
    if (e.surface !== 'terminal') {
      const { Box, Svg } = $.ui.resolve(e)
      // no width: the drawing keeps its own size and shrinks to a narrower slot
      return (
        <Box paddingX={1} justifyContent="center">
          <Svg key="usage" source={svg(ps)} alt={describe(ps)} />
        </Box>
      )
    }

    // terminal: the same hierarchy in cells — dim label, bold figure, orange gauge
    const { Box, Text } = $.ui.resolve(e)
    const figure = (p: Part) => {
      const n = p.value === undefined ? '—' : `${p.value}%`
      if (p.value === undefined || p.level === 'ok') return <Text bold>{n}</Text>
      if (p.level === 'warn') return <Text bold color="claude">{n}</Text>
      return <Text bold inverse color="claude">{` ${n} `}</Text>
    }

    return (
      <Box flexWrap="wrap" columnGap={3} justifyContent="center">
        <Text color="claude">✻</Text>
        {ps.map(p => {
          const [lit, unlit] = bar(p.value)
          return (
            <Text key={p.key}>
              <Text dimColor>{p.label} </Text>
              {figure(p)}
              <Text> </Text>
              <Text color="claude">{lit}</Text>
              <Text color="subtle">{unlit}</Text>
              {p.caption ? <Text dimColor italic>{` ${p.caption}`}</Text> : null}
            </Text>
          )
        })}
      </Box>
    )
  })
}
