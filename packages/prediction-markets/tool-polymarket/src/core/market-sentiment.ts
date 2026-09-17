/**
 * Core logic for `market_sentiment`. Framework-agnostic.
 *
 * Real public discussion, not a derived/computed signal: the raw comment
 * thread on the market's event. Polymarket threads comments per-event
 * (shared across an event's sibling markets), not per-sub-market.
 */

import { getEventComments, getMarketEvent } from '../polymarket-client.ts'
import type { MarketComment } from '../polymarket-client.ts'

export interface MarketSentimentArgs {
  marketId: string
  limit?: number
}

export interface MarketSentimentOutput {
  marketId: string
  eventTitle: string
  comments: MarketComment[]
}

export async function runMarketSentiment(
  args: MarketSentimentArgs, ctx: { signal: AbortSignal },
): Promise<MarketSentimentOutput> {
  const event = await getMarketEvent(args.marketId, ctx.signal)
  if (!event) return { marketId: args.marketId, eventTitle: '', comments: [] }
  const comments = await getEventComments(event.eventId, args.limit ?? 10, ctx.signal)
  return { marketId: args.marketId, eventTitle: event.title, comments }
}

export function summarizeMarketSentiment(_args: MarketSentimentArgs, value: MarketSentimentOutput): string {
  if (value.comments.length === 0) return `No public comments found for ${value.eventTitle || 'this market'}.`
  const lines = value.comments.slice(0, 5).map(c => `- ${c.author}: ${c.body}`)
  return `${value.eventTitle}: ${String(value.comments.length)} comment(s)\n${lines.join('\n')}`
}
