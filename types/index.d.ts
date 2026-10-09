export type Limit = { kind: string; percentUsed: number; resetsAt?: string }
export type Snapshot = {
  ctxPercent?: number
  ctxTokens?: number
  ctxWindow: number
  limits: Limit[]
}

declare module 'claude-code' {
  interface PluginState {
    'usage-band': { snap: Snapshot | null; now: number }
  }
}
