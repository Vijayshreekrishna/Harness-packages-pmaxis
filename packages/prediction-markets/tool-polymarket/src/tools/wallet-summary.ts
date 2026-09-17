import { defineTool } from '@deepseek-ai/dsh-tools'
import { runWalletSummary, summarizeWalletSummary } from '../core/wallet-summary.ts'

const positionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string', required: true },
    outcome: { type: 'string', required: true },
    size: { type: 'number', required: true },
    avgPrice: { type: 'number', required: true },
    currentPrice: { type: 'number', required: true },
    currentValue: { type: 'number', required: true },
    cashPnl: { type: 'number', required: true },
    percentPnl: { type: 'number', required: true },
    redeemable: { type: 'boolean', required: true },
  },
} as const

const activitySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    type: { type: 'string', required: true },
    title: { type: 'string', required: true },
    outcome: { type: 'string', required: true },
    side: { type: 'json', required: true, description: 'string, or null when not a trade row.' },
    price: { type: 'json', required: true, description: 'number, or null when not a trade row.' },
    size: { type: 'json', required: true, description: 'number, or null when not a trade row.' },
    timestamp: { type: 'string', required: true },
  },
} as const

/**
 * Real, on-chain-indexed data for a public wallet address: its current
 * positions and recent activity. Replaces `market_position_summary`, which
 * asked the model to invent a hypothetical position — this only reports what
 * an actual address actually holds and did, never a fabricated scenario.
 */
export const walletSummaryTool = defineTool({
  name: 'wallet_summary',
  description:
    'Look up a public Polymarket wallet address\'s real current positions and recent '
    + 'activity. This is real on-chain-indexed data for an actual address, not a '
    + 'hypothetical or simulated position — only use it when the user gives you (or asks '
    + 'about) a specific wallet address.',
  parameters: {
    address: { type: 'string', required: true, description: 'A Polymarket/Polygon wallet address (0x...).' },
    limit: { type: 'integer', description: 'Max positions/activity rows to return. Defaults to 10.' },
  },
  output: {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        address: { type: 'string', required: true },
        positions: { type: 'array', required: true, items: positionSchema },
        recentActivity: { type: 'array', required: true, items: activitySchema },
      },
    },
    render: (args, value) => [{
      type: 'text',
      text: summarizeWalletSummary(args, {
        ...value,
        recentActivity: value.recentActivity.map(a => ({
          ...a,
          side: typeof a.side === 'string' ? a.side : null,
          price: typeof a.price === 'number' ? a.price : null,
          size: typeof a.size === 'number' ? a.size : null,
        })),
      }),
    }],
    presentationMeta: (_args, value) => value,
  },
  async execute(args, exec) {
    return runWalletSummary(args, { signal: exec.signal })
  },
  presentCall: args => ({
    card: 'generic',
    title: 'Look up wallet positions',
    kind: 'other',
    rawInput: args.address,
  }),
})
