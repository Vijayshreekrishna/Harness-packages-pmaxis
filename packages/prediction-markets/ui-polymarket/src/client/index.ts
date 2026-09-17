/**
 * Registers the five Polymarket widgets on the `tool.call.toolview` slot, keyed
 * by the `market_*` tool names `@deepseek-ai/dsh-tool-polymarket` registers.
 * `search_market` claims no key and falls through to the stock GenericToolCard.
 * @module @deepseek-ai/dsh-client-ui-polymarket/client
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the SlotRegistry service merge (ctx.slots).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import { OrderTicket } from './widgets/OrderTicket.tsx'
import { PositionSummary } from './widgets/PositionSummary.tsx'
import { PriceLineChart } from './widgets/PriceLineChart.tsx'
import { ProbabilityGauge } from './widgets/ProbabilityGauge.tsx'
import { ResolutionCriteriaPanel } from './widgets/ResolutionCriteriaPanel.tsx'

export const name = 'ui-polymarket'
export const inject = ['slots']

/** Mount every Polymarket toolview onto `tool.call.toolview`. */
export function apply(ctx: ClientContext): void {
  ctx.slots.inject('tool.call.toolview', function* () {
    yield ctx.slots.register({ name: 'tool.call.toolview', key: 'market_probability_gauge' }, ProbabilityGauge)
    yield ctx.slots.register({ name: 'tool.call.toolview', key: 'market_price_chart' }, PriceLineChart)
    yield ctx.slots.register({ name: 'tool.call.toolview', key: 'market_order_ticket' }, OrderTicket)
    yield ctx.slots.register({ name: 'tool.call.toolview', key: 'market_resolution_criteria' }, ResolutionCriteriaPanel)
    yield ctx.slots.register({ name: 'tool.call.toolview', key: 'market_position_summary' }, PositionSummary)
  })
}
