/** Core logic for `market_position_summary`. Framework-agnostic. */

import { getMarket, getOrderBook, pickOutcome } from '../polymarket-client.ts'

export interface PositionSummaryArgs {
  marketId: string
  outcome?: string
  shares?: number
  avgPrice?: number
}

export interface PositionSummaryOutput {
  marketId: string
  outcome: string
  shares: number
  avgPrice: number
  currentPrice: number
  currentValue: number
  pnl: number
  mock: boolean
}

export async function runPositionSummary(
  args: PositionSummaryArgs, ctx: { signal: AbortSignal },
): Promise<PositionSummaryOutput> {
  const market = await getMarket(args.marketId, ctx.signal)
  const picked = pickOutcome(market, args.outcome)
  let currentPrice = picked.probability
  if (picked.clobTokenId) {
    const book = await getOrderBook(picked.clobTokenId, ctx.signal)
    const mid = (book.bids[0]?.price ?? currentPrice) + (book.asks[0]?.price ?? currentPrice)
    currentPrice = mid / 2
  }
  const shares = args.shares ?? 100
  const avgPrice = args.avgPrice ?? currentPrice
  const currentValue = shares * currentPrice
  const pnl = shares * (currentPrice - avgPrice)
  return {
    marketId: market.marketId,
    outcome: picked.label,
    shares,
    avgPrice,
    currentPrice,
    currentValue,
    pnl,
    mock: true,
  }
}

export function summarizePositionSummary(_args: PositionSummaryArgs, value: PositionSummaryOutput): string {
  return `Sample position (not a real holding): ${String(value.shares)} ${value.outcome} shares `
    + `@ avg ${value.avgPrice.toFixed(3)}, now ${value.currentPrice.toFixed(3)} `
    + `→ P&L ${value.pnl >= 0 ? '+' : ''}${value.pnl.toFixed(2)}`
}
