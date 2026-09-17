/** Core logic for `market_order_ticket`. Framework-agnostic. */

import { getMarket, getOrderBook, pickOutcome } from '../polymarket-client.ts'

export type OrderSide = 'buy' | 'sell'

export interface OrderTicketArgs {
  marketId: string
  outcome?: string
  side: OrderSide
}

export interface OrderTicketOutput {
  marketId: string
  question: string
  outcome: string
  side: OrderSide
  bestBid: number
  bestAsk: number
  suggestedPrice: number
  mock: boolean
}

export async function runOrderTicket(
  args: OrderTicketArgs, ctx: { signal: AbortSignal },
): Promise<OrderTicketOutput> {
  const market = await getMarket(args.marketId, ctx.signal)
  const picked = pickOutcome(market, args.outcome)
  if (!picked.clobTokenId) {
    throw new Error(`polymarket: outcome "${picked.label}" has no CLOB token id (market may be closed)`)
  }
  const book = await getOrderBook(picked.clobTokenId, ctx.signal)
  const bestBid = book.bids[0]?.price ?? 0
  const bestAsk = book.asks[0]?.price ?? 0
  return {
    marketId: market.marketId,
    question: market.question,
    outcome: picked.label,
    side: args.side,
    bestBid,
    bestAsk,
    suggestedPrice: args.side === 'buy' ? bestAsk : bestBid,
    mock: true,
  }
}

export function summarizeOrderTicket(_args: OrderTicketArgs, value: OrderTicketOutput): string {
  return `Order ticket preview (mock, not submitted): ${value.side} ${value.outcome} on `
    + `"${value.question}" @ ~${value.suggestedPrice.toFixed(3)} `
    + `(bid ${value.bestBid.toFixed(3)} / ask ${value.bestAsk.toFixed(3)})`
}
