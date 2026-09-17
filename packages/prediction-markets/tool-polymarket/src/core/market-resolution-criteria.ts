/** Core logic for `market_resolution_criteria`. Framework-agnostic. */

import { getMarket } from '../polymarket-client.ts'

export interface ResolutionCriteriaArgs {
  marketId: string
}

export interface ResolutionCriteriaOutput {
  marketId: string
  question: string
  rules: string
  resolutionSource: string | null
  endDate: string | null
}

export async function runResolutionCriteria(
  args: ResolutionCriteriaArgs, ctx: { signal: AbortSignal },
): Promise<ResolutionCriteriaOutput> {
  const market = await getMarket(args.marketId, ctx.signal)
  return {
    marketId: market.marketId,
    question: market.question,
    rules: market.description ?? 'No resolution rules text was provided for this market.',
    resolutionSource: market.resolutionSource,
    endDate: market.endDate,
  }
}

export function summarizeResolutionCriteria(_args: ResolutionCriteriaArgs, value: ResolutionCriteriaOutput): string {
  return `${value.question} — resolves by ${value.endDate ?? 'an unspecified date'}`
    + (value.resolutionSource ? ` per ${value.resolutionSource}` : '')
    + `.\n${value.rules}`
}
