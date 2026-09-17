/** Core logic for `market_group`. Framework-agnostic. */

import { getEventMarkets, getMarketEvent } from '../polymarket-client.ts'

export interface MarketGroupArgs {
  marketId: string
}

export interface MarketGroupSibling {
  marketId: string
  question: string
  active: boolean
  closed: boolean
  leadProbability: number | null
}

export interface MarketGroupOutput {
  eventTitle: string
  eventSlug: string
  markets: MarketGroupSibling[]
}

/**
 * Finds every sibling market grouped under the same event as `marketId` — e.g.
 * every "Fed rate cut by <month> meeting?" market under one "How many Fed rate
 * cuts in 2026?" event. Search results already mix these together loosely;
 * this returns the exact, complete set instead of relying on search relevance.
 */
export async function runMarketGroup(
  args: MarketGroupArgs, ctx: { signal: AbortSignal },
): Promise<MarketGroupOutput> {
  const event = await getMarketEvent(args.marketId, ctx.signal)
  if (!event) return { eventTitle: '', eventSlug: '', markets: [] }
  const markets = await getEventMarkets(event.eventId, ctx.signal)
  return {
    eventTitle: event.title,
    eventSlug: event.slug,
    markets: markets.map(m => ({
      marketId: m.marketId,
      question: m.question,
      active: m.active,
      closed: m.closed,
      leadProbability: m.outcomes[0]?.probability ?? null,
    })),
  }
}

export function summarizeMarketGroup(_args: MarketGroupArgs, value: MarketGroupOutput): string {
  if (value.markets.length === 0) return 'This market is not part of a multi-market event.'
  const lines = value.markets.map(m => {
    const prob = m.leadProbability === null ? '' : ` — ${(m.leadProbability * 100).toFixed(1)}%`
    return `- ${m.question}${prob} (id: ${m.marketId})${m.closed ? ' [closed]' : ''}`
  })
  return `${value.eventTitle}: ${String(value.markets.length)} related market(s)\n${lines.join('\n')}`
}
