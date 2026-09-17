/**
 * Core logic for `wallet_summary`. Framework-agnostic.
 *
 * Real, on-chain-indexed data for a public wallet address: its current
 * positions and recent activity, in one call. Replaces the old
 * `market_position_summary`, which asked the model to invent a hypothetical
 * shares/avg-price position — this only ever reports what an actual address
 * actually holds and did. Positions and activity are two different questions
 * ("what do they hold" vs "what did they just do") almost always asked
 * together, so this is one tool rather than two.
 */

import { getWalletActivity, getWalletPositions } from '../polymarket-client.ts'
import type { WalletActivityRow, WalletPosition } from '../polymarket-client.ts'

export interface WalletSummaryArgs {
  address: string
  limit?: number
}

export interface WalletSummaryOutput {
  address: string
  positions: WalletPosition[]
  recentActivity: WalletActivityRow[]
}

export async function runWalletSummary(
  args: WalletSummaryArgs, ctx: { signal: AbortSignal },
): Promise<WalletSummaryOutput> {
  const limit = args.limit ?? 10
  const [positions, recentActivity] = await Promise.all([
    getWalletPositions(args.address, limit, ctx.signal),
    getWalletActivity(args.address, limit, ctx.signal),
  ])
  return { address: args.address, positions, recentActivity }
}

export function summarizeWalletSummary(_args: WalletSummaryArgs, value: WalletSummaryOutput): string {
  if (value.positions.length === 0 && value.recentActivity.length === 0) {
    return `No public positions or activity found for ${value.address}.`
  }
  const posLines = value.positions.slice(0, 5).map(p =>
    `- ${p.title} (${p.outcome}): ${p.size.toFixed(2)} shares @ avg ${p.avgPrice.toFixed(3)}, `
    + `now ${p.currentPrice.toFixed(3)} → P&L ${p.cashPnl >= 0 ? '+' : ''}${p.cashPnl.toFixed(2)}`)
  return `${value.address}: ${String(value.positions.length)} open position(s), `
    + `${String(value.recentActivity.length)} recent activity row(s)\n${posLines.join('\n')}`
}
