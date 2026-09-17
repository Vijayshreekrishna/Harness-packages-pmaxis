/**
 * Core logic for `market_trades`. Framework-agnostic.
 *
 * Distinct from `market_quote`: the order book is resting, unfilled orders
 * (what people are willing to trade at); this is the feed of trades that
 * actually executed. A tight quote with zero recent trades is a market
 * nobody's really trading, not a liquid one.
 */

import { getMarket, getMarketTrades } from '../polymarket-client.ts'
import type { MarketTrade } from '../polymarket-client.ts'

export interface MarketTradesArgs {
  marketId: string
  limit?: number
}

export interface MarketTradesOutput {
  marketId: string
  question: string
  trades: MarketTrade[]
}

export async function runMarketTrades(
  args: MarketTradesArgs, ctx: { signal: AbortSignal },
): Promise<MarketTradesOutput> {
  const market = await getMarket(args.marketId, ctx.signal)
  const trades = await getMarketTrades(market.conditionId, args.limit ?? 20, ctx.signal)
  return { marketId: market.marketId, question: market.question, trades }
}

export function summarizeMarketTrades(_args: MarketTradesArgs, value: MarketTradesOutput): string {
  const last = value.trades[0]
  if (!last) return `${value.question}: no recent trades.`
  return `${value.question}: ${String(value.trades.length)} recent trade(s), `
    + `latest ${last.side} ${last.outcome} @ ${last.price.toFixed(3)} x ${last.size.toFixed(2)} (${last.timestamp})`
}
