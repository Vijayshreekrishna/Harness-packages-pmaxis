import { defineTool } from '@deepseek-ai/dsh-tools'
import { runSearchMarket, summarizeSearchMarket } from '../core/search-market.ts'

/**
 * Master discovery tool: the WebSearch-style, primary entry point into Polymarket.
 * One free-text query returns a ranked list of markets already enriched with
 * probabilities, volume, liquidity, and resolution date/source — call this first
 * for anything Polymarket-related; only reach for the narrower `market_*` tools
 * when you already have a `marketId` and need a live order book, price series,
 * or the full resolution rules text.
 */
export const searchMarketTool = defineTool({
  name: 'search_market',
  description:
    'Search Polymarket for markets matching a free-text query (a topic, an event, or a '
    + 'partial question) and return them already enriched with current probabilities, '
    + 'volume, liquidity, and resolution end date/source — one call, no follow-up needed '
    + 'to see where a market stands. This is the primary Polymarket tool: call it first '
    + 'for any Polymarket question. Use the market ids it returns with market_probability_gauge, '
    + 'market_price_chart, market_order_ticket, market_resolution_criteria, or '
    + 'market_position_summary only when you need one of those narrower views.',
  parameters: {
    query: { type: 'string', required: true, description: 'Free-text search terms.' },
    limit: { type: 'integer', description: 'Max results to return. Defaults to 8.' },
  },
  output: {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        results: {
          type: 'array',
          required: true,
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              marketId: { type: 'string', required: true },
              question: { type: 'string', required: true },
              slug: { type: 'string', required: true },
              active: { type: 'boolean', required: true },
              closed: { type: 'boolean', required: true },
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
              volume: { type: 'json', required: true, description: 'number, or null when unknown.' },
              liquidity: { type: 'json', required: true, description: 'number, or null when unknown.' },
              endDate: { type: 'json', required: true, description: 'ISO 8601 string, or null when unset.' },
              resolutionSource: { type: 'json', required: true, description: 'string, or null when unset.' },
            },
          },
        },
      },
    },
    render: (args, value) => [{
      type: 'text',
      text: summarizeSearchMarket(args, {
        results: value.results.map(r => ({
          ...r,
          volume: typeof r.volume === 'number' ? r.volume : null,
          liquidity: typeof r.liquidity === 'number' ? r.liquidity : null,
          endDate: typeof r.endDate === 'string' ? r.endDate : null,
          resolutionSource: typeof r.resolutionSource === 'string' ? r.resolutionSource : null,
        })),
      }),
    }],
    presentationMeta: (_args, value) => value,
  },
  async execute(args, exec) {
    return runSearchMarket(args, { signal: exec.signal })
  },
  presentCall: args => ({
    card: 'generic',
    title: 'Search Polymarket markets',
    kind: 'other',
    rawInput: args.query,
  }),
})
