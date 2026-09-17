/**
 * Harness-agnostic core: every `run*`/`summarize*` pair here, plus
 * `../polymarket-client.ts`, is plain TypeScript with no dependency on
 * `@deepseek-ai/dsh-tools` or `@deepseek-ai/cordis`. `run*` fetches and shapes
 * the data; `summarize*` turns a result into one line of text. Both take only
 * plain arguments (`{ signal: AbortSignal }` for cancellation, no host context).
 *
 * `../tools/*.ts` is the deepseek-harness adapter: it wraps these functions in
 * `defineTool` — parameter/output JSON-schema, presentation hints, cordis
 * registration. To host this integration on a different harness (an MCP
 * server, another agent framework), reuse this directory and
 * `../polymarket-client.ts` unchanged, and write a new adapter in their place
 * that maps `run*`/`summarize*` onto that harness's own tool-definition API.
 * @module @deepseek-ai/dsh-tool-polymarket/core
 */

export * from './market-group.ts'
export * from './market-price-chart.ts'
export * from './market-quote.ts'
export * from './market-resolution-criteria.ts'
export * from './market-sentiment.ts'
export * from './market-trades.ts'
export * from './search-market.ts'
export * from './wallet-summary.ts'
