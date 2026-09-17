/**
 * Registers the Polymarket widgets on the `tool.call.toolview` slot, keyed
 * by the `market_*`/`wallet_*` tool names `@deepseek-ai/dsh-tool-polymarket`
 * registers. `search_market`, `market_group`, `market_trades`, and
 * `market_sentiment` claim no key and fall through to the stock
 * GenericToolCard.
 * @module @deepseek-ai/dsh-client-ui-polymarket/client
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the SlotRegistry service merge (ctx.slots).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import { MarketQuote } from './widgets/MarketQuote.tsx'
import { PriceLineChart } from './widgets/PriceLineChart.tsx'
import { ResolutionCriteriaPanel } from './widgets/ResolutionCriteriaPanel.tsx'
import { WalletSummary } from './widgets/WalletSummary.tsx'

export const name = 'ui-polymarket'
export const inject = ['slots']

/** Mount every Polymarket toolview onto `tool.call.toolview`. */
export function apply(ctx: ClientContext): void {
  ctx.slots.inject('tool.call.toolview', function* () {
    yield ctx.slots.register({ name: 'tool.call.toolview', key: 'market_price_chart' }, PriceLineChart)
    yield ctx.slots.register({ name: 'tool.call.toolview', key: 'market_quote' }, MarketQuote)
    yield ctx.slots.register({ name: 'tool.call.toolview', key: 'market_resolution_criteria' }, ResolutionCriteriaPanel)
    yield ctx.slots.register({ name: 'tool.call.toolview', key: 'wallet_summary' }, WalletSummary)
  })
}
