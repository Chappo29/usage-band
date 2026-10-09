import { test, expect, mock } from 'claude-code/testing'

import { countdown, parts } from './format'

const NOW = Date.parse('2026-10-09T12:00:00Z')

test('context and limits read what is used', async () => {
  const p = parts(
    {
      ctxPercent: 38,
      ctxTokens: 76_000,
      ctxWindow: 200_000,
      limits: [
        { kind: 'five_hour', percentUsed: 2.6, resetsAt: '2026-10-09T14:10:00Z' },
        { kind: 'seven_day', percentUsed: 51.4, resetsAt: '2026-10-12T16:00:00Z' },
      ],
    },
    NOW,
  )
  expect(p[0]).toEqual({ key: 'context', label: 'контекст · исп.', value: 38, caption: '76k из 200k', level: 'ok' })
  expect(p[1]).toEqual({ key: 'five_hour', label: '5 часов · исп.', value: 3, caption: 'сброс через 2ч 10м', level: 'ok' })
  expect(p[2]).toEqual({ key: 'seven_day', label: 'неделя · исп.', value: 52, caption: 'сброс через 3д 4ч', level: 'ok' })
  expect(parts({ ctxWindow: 1, limits: [{ kind: 'five_hour', percentUsed: 94.2 }] }, NOW)[1]?.level).toBe('low')
})

test('before the first response context shows only the window', async () => {
  const p = parts({ ctxWindow: 1_000_000, limits: [] }, NOW)
  expect(p).toEqual([{ key: 'context', label: 'контекст · исп.', caption: 'окно 1M', level: 'ok' }])
  expect(countdown(undefined, NOW)).toBe('')
})

test('band draws after a measurement on terminal and desktop', async ($, on) => {
  mock.clock(on)
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  await $.session.measure({
    context: { tokens: 150_000, window: 200_000, percent: 75 },
    rateLimits: [{ kind: 'five_hour', percentUsed: 94.2 }],
    changed: ['context', 'rateLimits'],
  })
  const props = { hasSurvey: false, isWorking: false, maxRows: 10, columns: 100 } as never

  const term = await $.ui.mount({ plugin: 'usage-band', surface: 'terminal', component: 'AbovePrompt', props })
  expect(await term.find({ type: 'Text', text: /^75%$/ })).toBeDefined()
  const low = await term.find({ type: 'Text', text: /^ 95% $/ })
  expect(low?.props.inverse).toBe(true)
  expect(await term.find({ type: 'Text', text: /150k из 200k/ })).toBeDefined()
  await term.unmount()

  const desk = await $.ui.mount({ plugin: 'usage-band', surface: 'desktop', component: 'AbovePrompt', props })
  const art = await desk.find({ type: 'Svg' })
  expect(art?.props.alt).toBe('контекст: использовано 75% (150k из 200k); 5 часов: использовано 95%')
  expect(String(art?.props.source)).toContain('class="num inv"')
  await desk.unmount()
})
