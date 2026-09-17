import { defineTool } from '@deepseek-ai/dsh-tools'
import { runMarketSentiment, summarizeMarketSentiment } from '../core/market-sentiment.ts'

/** Real public comment thread on the market's event — qualitative signal, not a computed one. */
export const marketSentimentTool = defineTool({
  name: 'market_sentiment',
  description:
    'Get real public discussion comments on a Polymarket market\'s event. Use this when the '
    + 'user wants to know what traders are actually saying, not just the priced probability.',
  parameters: {
    marketId: { type: 'string', required: true, description: 'The Polymarket market id.' },
    limit: { type: 'integer', description: 'Max comments to return. Defaults to 10.' },
  },
  output: {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        marketId: { type: 'string', required: true },
        eventTitle: { type: 'string', required: true },
        comments: {
          type: 'array',
          required: true,
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              author: { type: 'string', required: true },
              body: { type: 'string', required: true },
              createdAt: { type: 'string', required: true },
            },
          },
        },
      },
    },
    render: (args, value) => [{ type: 'text', text: summarizeMarketSentiment(args, value) }],
    presentationMeta: (_args, value) => value,
  },
  async execute(args, exec) {
    return runMarketSentiment(args, { signal: exec.signal })
  },
  presentCall: args => ({
    card: 'generic',
    title: 'Check market discussion',
    kind: 'other',
    rawInput: args.marketId,
  }),
})
