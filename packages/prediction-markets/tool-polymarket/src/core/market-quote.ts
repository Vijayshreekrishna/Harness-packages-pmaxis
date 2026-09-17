/**
 * Core logic for `market_quote`. Framework-agnostic.
 *
 * Replaces the old `market_order_ticket`, which forced a `side` parameter and
 * returned a "mock, not submitted" preview for only one side. There is no
 * hypothetical order here — this returns the real, current order book (both
 * sides, full depth, computed spread/midpoint) for one outcome. Nothing is
 * simulated or invented.
 */

import { getMarket, getOrderBook, pickOutcome } from '../polymarket-client.ts'
import type { OrderBookLevel } from '../polymarket-client.ts'

export interface MarketQuoteArgs {
  marketId: string
  outcome?: string
}

export interface MarketQuoteOutput {
  marketId: string
  question: string
  outcome: string
  bestBid: number | null
  bestAsk: number | null
  spread: number | null
  midpoint: number | null
  bidDepth: OrderBookLevel[]
  askDepth: OrderBookLevel[]
}

const DEPTH_LEVELS = 5

export async function runMarketQuote(
  args: MarketQuoteArgs, ctx: { signal: AbortSignal },
): Promise<MarketQuoteOutput> {
  const market = await getMarket(args.marketId, ctx.signal)
  const picked = pickOutcome(market, args.outcome)
  if (!picked.clobTokenId) {
    throw new Error(`polymarket: outcome "${picked.label}" has no CLOB token id (market may be closed)`)
  }
  const book = await getOrderBook(picked.clobTokenId, ctx.signal)
  const bestBid = book.bids[0]?.price ?? null
  const bestAsk = book.asks[0]?.price ?? null
  return {
    marketId: market.marketId,
    question: market.question,
    outcome: picked.label,
    bestBid,
    bestAsk,
    spread: bestBid !== null && bestAsk !== null ? Number((bestAsk - bestBid).toFixed(4)) : null,
    midpoint: bestBid !== null && bestAsk !== null ? Number(((bestAsk + bestBid) / 2).toFixed(4)) : null,
    bidDepth: book.bids.slice(0, DEPTH_LEVELS),
    askDepth: book.asks.slice(0, DEPTH_LEVELS),
  }
}

export function summarizeMarketQuote(_args: MarketQuoteArgs, value: MarketQuoteOutput): string {
  if (value.bestBid === null && value.bestAsk === null) {
    return `${value.question} (${value.outcome}): no live order book (market may be illiquid or closed).`
  }
  const bid = value.bestBid === null ? '—' : value.bestBid.toFixed(3)
  const ask = value.bestAsk === null ? '—' : value.bestAsk.toFixed(3)
  const mid = value.midpoint === null ? '' : `, mid ${value.midpoint.toFixed(3)}`
  const spread = value.spread === null ? '' : `, spread ${value.spread.toFixed(3)}`
  return `${value.question} (${value.outcome}): bid ${bid} / ask ${ask}${mid}${spread}`
}
