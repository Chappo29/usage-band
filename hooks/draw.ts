import type { Part } from './format'

// Claude's palette: orange fills the gauges with what is used, ink on the figures; a
// figure turns orange as the reserve runs low and inverts when it is nearly gone.
const SERIF = `'Copernicus','Tiempos Headline','Iowan Old Style','Palatino Linotype',Georgia,serif`
const SANS = `'Styrene B','Segoe UI Variable Text','Segoe UI',system-ui,sans-serif`
const MONO = `'JetBrains Mono','Cascadia Code',Consolas,ui-monospace,monospace`

const TICKS = 20
const CELL = 222
const LEAD = 36
const H = 48
const SCALE = 1 / 1.5

const esc = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)

// Claude's spark: a hand-cut burst of tapered rays, uneven on purpose
const RAYS = [12, 8.5, 10.5, 7.5, 11.5, 9, 12, 8, 10, 7.5, 11, 9.5]
function spark(cx: number, cy: number): string {
  const rays = RAYS.map((len, i) =>
    `<path d="M0 -1.5 L${len} -0.3 L${len} 0.3 L0 1.5 Z" transform="rotate(${i * 30 - 84})"/>`,
  ).join('')
  return `<g class="o" transform="translate(${cx} ${cy})">${rays}<circle r="2.4"/></g>`
}

function gauge(x: number, y: number, fill: number | undefined): string {
  const lit = fill === undefined ? 0 : Math.round((fill / 100) * TICKS)
  return Array.from({ length: TICKS }, (_, i) =>
    `<rect class="${i < lit ? 'o' : 't'}" x="${(x + i * 6.6).toFixed(1)}" y="${y}" width="4" height="10" rx="1"/>`,
  ).join('')
}

function cell(p: Part, x: number): string {
  const n = p.value === undefined ? '—' : String(p.value)
  const tone = p.value === undefined || p.level === 'ok' ? 'ink' : p.level === 'warn' ? 'o' : 'inv'
  const pill = tone === 'inv'
    ? `<rect class="o" x="${x - 5}" y="8" width="${n.length * 16 + 22}" height="33" rx="7"/>`
    : ''
  const col = x + 74
  return `<g>${pill}
<text class="num ${tone}" x="${x}" y="35">${n}${p.value === undefined ? '' : '<tspan class="pct" dx="1.5">%</tspan>'}</text>
<text class="lbl mut" x="${col}" y="13">${esc(p.label.toUpperCase())}</text>
${gauge(col, 19, p.value)}
<text class="cap mut" x="${col}" y="43">${esc(p.caption)}</text></g>`
}

export function svg(ps: Part[]): string {
  const width = LEAD + ps.length * CELL - 16
  const cells = ps.map((p, i) => cell(p, LEAD + i * CELL)).join('')
  const rules = ps.slice(1).map((_, i) => {
    const x = LEAD + (i + 1) * CELL - 16
    return `<line class="rule" x1="${x}" y1="8" x2="${x}" y2="42"/>`
  }).join('')
  // drawn on a roomy grid, shown at two thirds of it
  const source = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(width * SCALE)}" height="${Math.round(H * SCALE)}" viewBox="0 0 ${width} ${H}">
<style>
.o{fill:#C15F3C}.t{fill:#E6E2D6}.ink{fill:#1F1E1D}.mut{fill:#73716A}.inv{fill:#FAF9F5}
.rule{stroke:#1F1E1D;stroke-opacity:.12}
.num{font-family:${SERIF};font-size:32px;font-style:italic;font-weight:500;letter-spacing:-.03em}
.pct{font-size:14px;font-style:normal;letter-spacing:0}
.lbl{font-family:${SANS};font-size:11px;font-weight:600;letter-spacing:.16em}
.cap{font-family:${MONO};font-size:12px}
@media (prefers-color-scheme: dark){
.o{fill:#E2805C}.t{fill:#3A3935}.ink{fill:#F5F4EE}.mut{fill:#A09E96}.inv{fill:#1A1918}
.rule{stroke:#F5F4EE;stroke-opacity:.14}
}
</style>
${spark(14, 24)}${rules}${cells}
</svg>`
  return source
}
