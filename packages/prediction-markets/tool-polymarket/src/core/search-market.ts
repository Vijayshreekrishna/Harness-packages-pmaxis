/**
 * Core logic for `search_market`: the primary, WebSearch-style entry point into
 * Polymarket. One free-text query returns a ranked list of markets already
 * enriched with probabilities, volume, liquidity, and resolution date/source —
 * everything Gamma's `/markets?q=` response already carries — so a caller rarely
 * needs a follow-up call just to see what a market is and where it stands.
 * Framework-agnostic: no `@deepseek-ai/dsh-tools` or `@deepseek-ai/cordis` import.
 */

import type { PolymarketMarket } from '../polymarket-client.ts'
import { searchMarkets } from '../polymarket-client.ts'

export interface SearchMarketArgs {
  query: string
  limit?: number
}

export interface SearchMarketOutcome {
  label: string
  probability: number
}

export interface SearchMarketResult {
  marketId: string
  question: string
  slug: string
  active: boolean
  closed: boolean
  outcomes: SearchMarketOutcome[]
  volume: number | null
  liquidity: number | null
  endDate: string | null
  resolutionSource: string | null
}

export interface SearchMarketOutput {
  results: SearchMarketResult[]
}

function toResult(market: PolymarketMarket): SearchMarketResult {
  return {
    marketId: market.marketId,
    question: market.question,
    slug: market.slug,
    active: market.active,
    closed: market.closed,
    outcomes: market.outcomes.map(o => ({ label: o.label, probability: o.probability })),
    volume: market.volume,
    liquidity: market.liquidity,
    endDate: market.endDate,
    resolutionSource: market.resolutionSource,
  }
}

/** Runs the search and enriches every result in the same call — no per-market follow-up fetch. */
export async function runSearchMarket(
  args: SearchMarketArgs, ctx: { signal: AbortSignal },
): Promise<SearchMarketOutput> {
  const markets = await searchMarkets(args.query, args.limit ?? 8, ctx.signal)
  return { results: markets.map(toResult) }
}

function leadOutcome(outcomes: SearchMarketOutcome[]): SearchMarketOutcome | undefined {
  return [...outcomes].sort((a, b) => b.probability - a.probability)[0]
}

function formatResult(result: SearchMarketResult): string {
  const lead = leadOutcome(result.outcomes)
  const probability = lead ? `${lead.label} ${(lead.probability * 100).toFixed(1)}%` : 'no outcomes'
  const volume = result.volume === null ? '' : `, vol $${Math.round(result.volume).toLocaleString('en-US')}`
  const resolves = result.endDate ? `, resolves ${result.endDate}` : ''
  const status = result.closed ? ' [closed]' : ''
  return `- ${result.question} — ${probability}${volume}${resolves} (id: ${result.marketId})${status}`
}

export function summarizeSearchMarket(_args: SearchMarketArgs, value: SearchMarketOutput): string {
  if (value.results.length === 0) return 'No matching markets found.'
  return `Found ${String(value.results.length)} market(s):\n${value.results.map(formatResult).join('\n')}`
}
