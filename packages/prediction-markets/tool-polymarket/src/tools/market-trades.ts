import { defineTool } from '@deepseek-ai/dsh-tools'
import { runMarketTrades, summarizeMarketTrades } from '../core/market-trades.ts'

/** Recently executed trades (real fills), distinct from the resting-order market_quote book. */
export const marketTradesTool = defineTool({
  name: 'market_trades',
  description:
    'Get recently executed trades for a Polymarket market — real fills (price, size, side, '
    + 'time), not resting order-book quotes. Use this to check whether a market is actually '
    + 'trading, not just quoted.',
  parameters: {
    marketId: { type: 'string', required: true, description: 'The Polymarket market id.' },
    limit: { type: 'integer', description: 'Max trades to return. Defaults to 20.' },
  },
  output: {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        marketId: { type: 'string', required: true },
        question: { type: 'string', required: true },
        trades: {
          type: 'array',
          required: true,
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              side: { type: 'string', required: true, enum: ['BUY', 'SELL'] },
              outcome: { type: 'string', required: true },
              price: { type: 'number', required: true },
              size: { type: 'number', required: true },
              timestamp: { type: 'string', required: true },
            },
          },
        },
      },
    },
    render: (args, value) => [{ type: 'text', text: summarizeMarketTrades(args, value) }],
    presentationMeta: (_args, value) => value,
  },
  async execute(args, exec) {
    return runMarketTrades(args, { signal: exec.signal })
  },
  presentCall: args => ({
    card: 'generic',
    title: 'Check recent trades',
    kind: 'other',
    rawInput: args.marketId,
  }),
})
