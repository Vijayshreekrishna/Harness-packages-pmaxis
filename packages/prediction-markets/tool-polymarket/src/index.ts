/**
 * Registers six model-facing Polymarket research tools over the public Gamma and CLOB
 * REST APIs: `search_market` (the primary, WebSearch-style entry point — enriched
 * search results in one call), `market_probability_gauge`, `market_price_chart`, a mock
 * `market_order_ticket` preview, `market_resolution_criteria`, and a mock
 * `market_position_summary`. Each tool's structured output rides `output.presentationMeta`
 * onto `tool/result.meta`, which is exactly what the `tool.call.toolview` widgets in
 * `@deepseek-ai/dsh-client-ui-polymarket` read.
 *
 * This file (the cordis plugin) and `./tools/*.ts` (the `defineTool` wiring) are the
 * only deepseek-harness-specific layer. All the actual Polymarket logic lives in
 * `./polymarket-client.ts` and `./core/*.ts`, which have no dependency on
 * `@deepseek-ai/dsh-tools` or `@deepseek-ai/cordis` — see `./core/index.ts` for the
 * portability contract if adapting this integration to a different harness.
 *
 * Registration is gated by `config.enabled` (default true), read once at load from
 * whatever `cordis.patch.yml` sets. NOTE: this is a deployment-time toggle only — it
 * is not yet wired to a live Settings UI card. Doing that correctly needs reactive
 * re-registration when a `tools.polymarket` settings section changes after load
 * (mirroring the `onChange` pattern other settings-backed plugins use), which this
 * package does not implement yet; wiring a `settings.plugin.item` card ahead of that
 * would silently do nothing when toggled, so it is left out rather than shipped
 * broken.
 * @module @deepseek-ai/dsh-tool-polymarket
 */

import { cpSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { marketOrderTicketTool } from './tools/market-order-ticket.ts'
import { marketPositionSummaryTool } from './tools/market-position-summary.ts'
import { marketPriceChartTool } from './tools/market-price-chart.ts'
import { marketProbabilityGaugeTool } from './tools/market-probability-gauge.ts'
import { marketResolutionCriteriaTool } from './tools/market-resolution-criteria.ts'
import { searchMarketTool } from './tools/search-market.ts'

export const name = 'tool-polymarket'
export const inject = ['tools']

export interface Config {
  /** Whether the Polymarket tools register at all. Defaults to true. */
  enabled: boolean
}

export const Config: z<Config> = z.object({
  enabled: z.boolean().default(true),
})

/**
 * Copies the shipped `polymarket-research` agent preset into
 * `<dshHome>/.agent-presets/`, exactly like `dsh-pmaxis-preset` does for its
 * `pmex` preset — `@deepseek-ai/dsh-agent-presets` scans that directory as a
 * `user`-trust root by default (`includeUserRoot: true`), so the preset shows
 * up in the picker without this package needing to touch the `agent-presets`
 * row's own `roots` config (which a patch would otherwise have to fully
 * restate, risking clobbering a deployment's other roots).
 */
function installPreset(): void {
  const dshHome = process.env.DSH_HOME ?? join(homedir(), '.dsh')
  const src = join(dirname(fileURLToPath(import.meta.url)), '..', 'presets', 'polymarket-research')
  const dest = join(dshHome, '.agent-presets', 'polymarket-research')
  mkdirSync(dirname(dest), { recursive: true })
  cpSync(src, dest, { recursive: true })
}

/**
 * Register the Polymarket tools on `ctx.tools` when `config.enabled`, and
 * install the `polymarket-research` agent preset.
 * @param ctx - registrant context carrying the tool registry.
 * @param config - `enabled` toggle, set from `cordis.patch.yml`.
 */
export function apply(ctx: Context, config: Config): void {
  installPreset()
  if (!config.enabled) return

  ctx.tools.register(searchMarketTool)
  ctx.tools.register(marketProbabilityGaugeTool)
  ctx.tools.register(marketPriceChartTool)
  ctx.tools.register(marketOrderTicketTool)
  ctx.tools.register(marketResolutionCriteriaTool)
  ctx.tools.register(marketPositionSummaryTool)
}
