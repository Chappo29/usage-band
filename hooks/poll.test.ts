import { test, expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { parseUsage, USAGE_URL } from './poll'

const BODY = JSON.stringify({
  five_hour: { utilization: 3, resets_at: '2026-10-09T14:00:00Z' },
  seven_day: { utilization: 51.4, resets_at: '2026-10-12T16:00:00Z' },
  seven_day_opus: null,
})
const PROPS = { hasSurvey: false, isWorking: false, maxRows: 10, columns: 100 } as never

test('reads the 5-hour and weekly windows from /usage', async () => {
  expect(parseUsage(BODY)).toEqual([
    { kind: 'five_hour', percentUsed: 3, resetsAt: '2026-10-09T14:00:00Z' },
    { kind: 'seven_day', percentUsed: 51.4, resetsAt: '2026-10-12T16:00:00Z' },
  ])
  expect(parseUsage('not json')).toBe(null)
  expect(parseUsage('{}')).toBe(null)
})

function engine(on: On, reply: { status: number; text: string }, isLoggedIn = true) {
  const asked: { url: string; auth?: string }[] = []
  mock.clock(on)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({
    value: { startedAt: 0, context: { tokens: 50_000, window: 200_000, percent: 25 }, rateLimits: [] },
  }))
  on('session.authorize', () => ({ value: isLoggedIn ? { handle: 'h1', kind: 'bearer' as const } : null }))
  on('http.fetch', (_$, e) => {
    asked.push({ url: e.url, auth: e.init?.auth })
    return { value: { status: reply.status, ok: reply.status < 300, headers: {}, text: reply.text } }
  })
  return asked
}

test('limits come from /usage with the session credential', async ($, on) => {
  const asked = engine(on, { status: 200, text: BODY })
  await $.session.start({ cwd: '.', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ plugin: 'usage-band', surface: 'terminal', component: 'AbovePrompt', props: PROPS })
  expect(asked).toEqual([{ url: USAGE_URL, auth: 'h1' }])
  expect(await ui.find({ type: 'Text', text: /^3%$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^52%$/ })).toBeDefined()
  await ui.unmount()
})

test('a failed poll leaves the band on what it had', async ($, on) => {
  engine(on, { status: 429, text: '' })
  await $.session.start({ cwd: '.', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ plugin: 'usage-band', surface: 'terminal', component: 'AbovePrompt', props: PROPS })
  expect(await ui.find({ type: 'Text', text: /^25%$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /5 часов/ })).toBeUndefined()
  await ui.unmount()
})

test('without a Claude login nothing is asked', async ($, on) => {
  const asked = engine(on, { status: 200, text: BODY }, false)
  await $.session.start({ cwd: '.', surface: 'terminal', isInteractive: true })
  expect(asked).toEqual([])
})
