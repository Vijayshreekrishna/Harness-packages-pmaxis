import { defineTool } from '@deepseek-ai/dsh-tools'
import { runProbabilityGauge, summarizeProbabilityGauge } from '../core/market-probability-gauge.ts'

/** Renders the ProbabilityGauge widget: current outcome probabilities for one market. */
export const marketProbabilityGaugeTool = defineTool({
  name: 'market_probability_gauge',
  description:
    'Get the current implied probability of each outcome for one Polymarket market, '
    + 'from its market id. Use this to answer "what is the probability/chance of X" '
    + 'questions. Find the market id with search_market first if you do not have one.',
  parameters: {
    marketId: { type: 'string', required: true, description: 'The Polymarket market id.' },
  },
  output: {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        marketId: { type: 'string', required: true },
        question: { type: 'string', required: true },
        outcomes: {
          type: 'array',
          required: true,
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              label: { type: 'string', required: true },
              probability: { type: 'number', required: true },
            },
          },
        },
        asOf: { type: 'string', required: true, description: 'ISO 8601 timestamp.' },
      },
    },
    render: (args, value) => [{ type: 'text', text: summarizeProbabilityGauge(args, value) }],
    presentationMeta: (_args, value) => value,
  },
  async execute(args, exec) {
    return runProbabilityGauge(args, { signal: exec.signal })
  },
  presentCall: args => ({
    card: 'generic',
    title: 'Check market probability',
    kind: 'other',
    rawInput: args.marketId,
  }),
})
