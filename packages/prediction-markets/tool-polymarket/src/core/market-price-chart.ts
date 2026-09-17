/** Core logic for `market_price_chart`. Framework-agnostic. */

import { getMarket, getPriceHistory, pickOutcome } from '../polymarket-client.ts'

export interface PriceChartArgs {
  marketId: string
  outcome?: string
  interval?: string
}

export interface PriceChartPoint {
  t: string
  price: number
}

export interface PriceChartOutput {
  marketId: string
  question: string
  outcome: string
  series: PriceChartPoint[]
}

export async function runPriceChart(
  args: PriceChartArgs, ctx: { signal: AbortSignal },
): Promise<PriceChartOutput> {
  const market = await getMarket(args.marketId, ctx.signal)
  const picked = pickOutcome(market, args.outcome)
  if (!picked.clobTokenId) {
    throw new Error(`polymarket: outcome "${picked.label}" has no CLOB token id (market may be closed)`)
  }
  const series = await getPriceHistory(picked.clobTokenId, args.interval ?? '1d', ctx.signal)
  return { marketId: market.marketId, question: market.question, outcome: picked.label, series }
}

export function summarizePriceChart(_args: PriceChartArgs, value: PriceChartOutput): string {
  const last = value.series.at(-1)
  return `Price history for ${value.question} (${value.outcome}): `
    + `${String(value.series.length)} points`
    + (last ? `, latest ${last.price.toFixed(3)} at ${last.t}` : '')
}
