import { defineTool } from '@deepseek-ai/dsh-tools'
import { runMarketGroup, summarizeMarketGroup } from '../core/market-group.ts'

/** Finds every sibling market under the same event, e.g. every FOMC-meeting-date market. */
export const marketGroupTool = defineTool({
  name: 'market_group',
  description:
    'List every sibling market grouped under the same event as the given market id — e.g. '
    + 'every "Fed rate cut by <month> meeting?" market under one umbrella event. Use this '
    + 'when the user wants the complete, exact set of related markets rather than whatever '
    + 'search_market happens to rank highest.',
  parameters: {
    marketId: { type: 'string', required: true, description: 'The Polymarket market id.' },
  },
  output: {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        eventTitle: { type: 'string', required: true },
        eventSlug: { type: 'string', required: true },
        markets: {
          type: 'array',
          required: true,
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              marketId: { type: 'string', required: true },
              question: { type: 'string', required: true },
              active: { type: 'boolean', required: true },
              closed: { type: 'boolean', required: true },
              leadProbability: { type: 'json', required: true, description: 'number, or null when unknown.' },
            },
          },
        },
      },
    },
    render: (args, value) => [{
      type: 'text',
      text: summarizeMarketGroup(args, {
        ...value,
        markets: value.markets.map(m => ({
          ...m,
          leadProbability: typeof m.leadProbability === 'number' ? m.leadProbability : null,
        })),
      }),
    }],
    presentationMeta: (_args, value) => value,
  },
  async execute(args, exec) {
    return runMarketGroup(args, { signal: exec.signal })
  },
  presentCall: args => ({
    card: 'generic',
    title: 'Find related markets',
    kind: 'other',
    rawInput: args.marketId,
  }),
})
