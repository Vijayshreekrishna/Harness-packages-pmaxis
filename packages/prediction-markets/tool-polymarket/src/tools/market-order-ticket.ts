import { defineTool } from '@deepseek-ai/dsh-tools'
import { runOrderTicket, summarizeOrderTicket } from '../core/market-order-ticket.ts'

const SIDES = ['buy', 'sell'] as const

/**
 * Renders the OrderTicket widget: a read-only, prefilled order preview from the
 * live CLOB order book. Never places an order — v1 has no wallet/trading auth.
 */
export const marketOrderTicketTool = defineTool({
  name: 'market_order_ticket',
  description:
    'Preview a buy/sell order ticket for one outcome of a Polymarket market, prefilled '
    + 'from the live order book (best bid/ask). This is a READ-ONLY PREVIEW: it never '
    + 'places a real order. Use it when the user wants to see what an order would look '
    + 'like, not to execute a trade.',
  parameters: {
    marketId: { type: 'string', required: true, description: 'The Polymarket market id.' },
    outcome: {
      type: 'string',
      description: 'Outcome label (e.g. "Yes"). Defaults to the market\'s first outcome.',
    },
    side: { type: 'string', required: true, enum: [...SIDES] },
  },
  output: {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        marketId: { type: 'string', required: true },
        question: { type: 'string', required: true },
        outcome: { type: 'string', required: true },
        side: { type: 'string', required: true, enum: [...SIDES] },
        bestBid: { type: 'number', required: true },
        bestAsk: { type: 'number', required: true },
        suggestedPrice: { type: 'number', required: true },
        mock: { type: 'boolean', required: true },
      },
    },
    render: (args, value) => [{ type: 'text', text: summarizeOrderTicket(args, value) }],
    presentationMeta: (_args, value) => value,
  },
  async execute(args, exec) {
    return runOrderTicket(args, { signal: exec.signal })
  },
  presentCall: args => ({
    card: 'generic',
    title: 'Preview order ticket (mock, not submitted)',
    kind: 'other',
    rawInput: args as Record<string, unknown>,
  }),
})
