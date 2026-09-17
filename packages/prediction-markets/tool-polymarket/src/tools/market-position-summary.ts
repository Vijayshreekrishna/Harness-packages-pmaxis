import { defineTool } from '@deepseek-ai/dsh-tools'
import { runPositionSummary, summarizePositionSummary } from '../core/market-position-summary.ts'

/**
 * Renders the PositionSummary widget. v1 has no wallet/portfolio integration, so this
 * always returns a clearly-labeled sample position priced against the live market —
 * useful for showing the widget and doing "what if" P&L, never a real holding.
 */
export const marketPositionSummaryTool = defineTool({
  name: 'market_position_summary',
  description:
    'Show a SAMPLE position summary (shares, average price, current value, P&L) for one '
    + 'outcome of a Polymarket market, priced against the live market. This is illustrative '
    + 'only — there is no wallet connected, so it is never a real holding. Use it for '
    + '"what if I had X shares at Y price" questions.',
  parameters: {
    marketId: { type: 'string', required: true, description: 'The Polymarket market id.' },
    outcome: {
      type: 'string',
      description: 'Outcome label (e.g. "Yes"). Defaults to the market\'s first outcome.',
    },
    shares: { type: 'number', description: 'Sample share count. Defaults to 100.' },
    avgPrice: { type: 'number', description: 'Sample average entry price (0-1). Defaults to the current price.' },
  },
  output: {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        marketId: { type: 'string', required: true },
        outcome: { type: 'string', required: true },
        shares: { type: 'number', required: true },
        avgPrice: { type: 'number', required: true },
        currentPrice: { type: 'number', required: true },
        currentValue: { type: 'number', required: true },
        pnl: { type: 'number', required: true },
        mock: { type: 'boolean', required: true },
      },
    },
    render: (args, value) => [{ type: 'text', text: summarizePositionSummary(args, value) }],
    presentationMeta: (_args, value) => value,
  },
  async execute(args, exec) {
    return runPositionSummary(args, { signal: exec.signal })
  },
  presentCall: args => ({
    card: 'generic',
    title: 'Sample position summary (not a real holding)',
    kind: 'other',
    rawInput: args as Record<string, unknown>,
  }),
})
