import { defineTool } from '@deepseek-ai/dsh-tools'
import { runMarketQuote, summarizeMarketQuote } from '../core/market-quote.ts'

const bookLevelSchema = {
  type: 'array',
  required: true,
  items: {
    type: 'object',
    additionalProperties: false,
    properties: {
      price: { type: 'number', required: true },
      size: { type: 'number', required: true },
    },
  },
} as const

/**
 * Renders the real, current order book for one outcome: best bid/ask, spread,
 * midpoint, and a few levels of depth on each side. Replaces the old
 * `market_order_ticket` — there is no "buy preview" vs "sell preview" split
 * (both sides come from the same book fetch) and nothing here is simulated.
 */
export const marketQuoteTool = defineTool({
  name: 'market_quote',
  description:
    'Get the live order book for one outcome of a Polymarket market: best bid, best ask, '
    + 'spread, midpoint, and a few levels of depth on each side. This is real, current data '
    + 'from the CLOB — not a trade preview and not a simulation. Use it when the user asks '
    + 'about liquidity, spread, or "what price could I actually trade at."',
  parameters: {
    marketId: { type: 'string', required: true, description: 'The Polymarket market id.' },
    outcome: {
      type: 'string',
      description: 'Outcome label (e.g. "Yes"). Defaults to the market\'s first outcome.',
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
        bestBid: { type: 'json', required: true, description: 'number, or null when the book is empty.' },
        bestAsk: { type: 'json', required: true, description: 'number, or null when the book is empty.' },
        spread: { type: 'json', required: true, description: 'number, or null when either side is empty.' },
        midpoint: { type: 'json', required: true, description: 'number, or null when either side is empty.' },
        bidDepth: bookLevelSchema,
        askDepth: bookLevelSchema,
      },
    },
    render: (args, value) => [{
      type: 'text',
      text: summarizeMarketQuote(args, {
        ...value,
        bestBid: typeof value.bestBid === 'number' ? value.bestBid : null,
        bestAsk: typeof value.bestAsk === 'number' ? value.bestAsk : null,
        spread: typeof value.spread === 'number' ? value.spread : null,
        midpoint: typeof value.midpoint === 'number' ? value.midpoint : null,
      }),
    }],
    presentationMeta: (_args, value) => value,
  },
  async execute(args, exec) {
    return runMarketQuote(args, { signal: exec.signal })
  },
  presentCall: args => ({
    card: 'generic',
    title: 'Check live order book',
    kind: 'other',
    rawInput: args as Record<string, unknown>,
  }),
})
