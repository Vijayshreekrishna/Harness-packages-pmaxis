/** Core logic for `market_probability_gauge`. Framework-agnostic. */

import { getMarket } from '../polymarket-client.ts'

export interface ProbabilityGaugeArgs {
  marketId: string
}

export interface ProbabilityGaugeOutcome {
  label: string
  probability: number
}

export interface ProbabilityGaugeOutput {
  marketId: string
  question: string
  outcomes: ProbabilityGaugeOutcome[]
  asOf: string
}

export async function runProbabilityGauge(
  args: ProbabilityGaugeArgs, ctx: { signal: AbortSignal },
): Promise<ProbabilityGaugeOutput> {
  const market = await getMarket(args.marketId, ctx.signal)
  return {
    marketId: market.marketId,
    question: market.question,
    outcomes: market.outcomes.map(o => ({ label: o.label, probability: o.probability })),
    asOf: new Date().toISOString(),
  }
}

export function summarizeProbabilityGauge(_args: ProbabilityGaugeArgs, value: ProbabilityGaugeOutput): string {
  return `${value.question}: ${value.outcomes
    .map(o => `${o.label} ${(o.probability * 100).toFixed(1)}%`)
    .join(', ')} (as of ${value.asOf})`
}
