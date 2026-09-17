import { defineTool } from '@deepseek-ai/dsh-tools'
import { runResolutionCriteria, summarizeResolutionCriteria } from '../core/market-resolution-criteria.ts'

/** Renders the ResolutionCriteriaPanel widget: how and when a market resolves. */
export const marketResolutionCriteriaTool = defineTool({
  name: 'market_resolution_criteria',
  description:
    'Get the resolution rules, source, and end date for one Polymarket market. Use this '
    + 'when the user asks how or when a market resolves, or what counts as "Yes"/"No".',
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
        rules: { type: 'string', required: true },
        resolutionSource: { type: 'json', required: true, description: 'string, or null when unset.' },
        endDate: { type: 'json', required: true, description: 'ISO 8601 string, or null when unset.' },
      },
    },
    render: (args, value) => [{
      type: 'text',
      text: summarizeResolutionCriteria(args, {
        ...value,
        resolutionSource: typeof value.resolutionSource === 'string' ? value.resolutionSource : null,
        endDate: typeof value.endDate === 'string' ? value.endDate : null,
      }),
    }],
    presentationMeta: (_args, value) => value,
  },
  async execute(args, exec) {
    return runResolutionCriteria(args, { signal: exec.signal })
  },
  presentCall: args => ({
    card: 'generic',
    title: 'Check resolution criteria',
    kind: 'other',
    rawInput: args.marketId,
  }),
})
