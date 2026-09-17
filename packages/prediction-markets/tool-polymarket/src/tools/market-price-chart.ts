import { defineTool } from '@deepseek-ai/dsh-tools'
import { runPriceChart, summarizePriceChart } from '../core/market-price-chart.ts'

const INTERVALS = ['1h', '6h', '1d', '1w', 'max'] as const

/** Renders the PriceLineChart widget: implied-probability time series for one outcome. */
export const marketPriceChartTool = defineTool({
  name: 'market_price_chart',
  description:
    'Get the price/probability history of one outcome of a Polymarket market, as a '
    + 'time series. Use this to answer "how has the probability moved" or "show me '
    + 'the price history" questions.',
  parameters: {
    marketId: { type: 'string', required: true, description: 'The Polymarket market id.' },
    outcome: {
      type: 'string',
      description: 'Outcome label to chart (e.g. "Yes"). Defaults to the market\'s first outcome.',
    },
    interval: {
      type: 'string', enum: [...INTERVALS],
      description: 'History window. Defaults to "1d".',
    },
  },
  output: {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        marketId: { type: 'string', required: true },
        question: { type: 'string', required: true },
        outcome: { type: 'string', required: true },
        series: {
          type: 'array',
          required: true,
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              t: { type: 'string', required: true },
              price: { type: 'number', required: true },
            },
          },
        },
      },
    },
    render: (args, value) => [{ type: 'text', text: summarizePriceChart(args, value) }],
    presentationMeta: (_args, value) => value,
  },
  async execute(args, exec) {
    return runPriceChart(args, { signal: exec.signal })
  },
  presentCall: args => ({
    card: 'generic',
    title: 'Check market price history',
    kind: 'other',
    rawInput: args.marketId,
  }),
})
