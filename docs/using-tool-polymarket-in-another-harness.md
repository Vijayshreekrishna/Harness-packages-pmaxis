# Using `tool-polymarket` (and `resolver-plugin`) in a different harness

`tool-polymarket` was built inside `deepseek-harness`, but the Polymarket
logic itself has zero dependency on it. This doc explains what's portable,
what isn't, and how to wire it into another agent framework, an MCP server,
or a plain script — using `resolver-plugin` (also in this repo) as a worked
second example of the same pattern.

## What's portable vs. framework-specific

```
polymarket-client.ts   <- 100% portable: fetch() calls to public REST APIs
core/*.ts              <- 100% portable: run*/summarize* functions
─────────────────────────────────────────────────────────────────
tools/*.ts              <- deepseek-harness-specific: wraps core/* in defineTool
index.ts                <- deepseek-harness-specific: cordis plugin registration
```

Everything above the line — `polymarket-client.ts` and every file under
`core/`  — imports nothing but the standard library and `fetch`. No
`@deepseek-ai/dsh-tools`, no `@deepseek-ai/cordis`, no host context object.
Each `run*` function takes only `(args, { signal })` and returns a plain
object; each `summarize*` function takes `(args, value)` and returns a
string. That's the entire contract.

Everything below the line is deepseek-harness's own tool-registration
boilerplate (JSON-schema parameter/output declarations, presentation hints
for its chat UI, cordis plugin lifecycle). That part does not port — you
replace it with your own harness's equivalent.

## The pattern, in three steps

1. **Copy `polymarket-client.ts` and `core/*.ts` unchanged** into your
   project (or `pnpm add`/`npm install` `@deepseek-ai/dsh-tool-polymarket`
   and import from `@deepseek-ai/dsh-tool-polymarket/src/core/*` — the
   package ships its `src/*` subpath so you can import the framework-agnostic
   layer directly without pulling in the cordis adapter).
2. **Write one small adapter file** per tool your target framework wants,
   mapping its tool-definition API onto the matching `run*`/`summarize*`
   pair. This is the *only* new code you write.
3. **Register those tool definitions** the way your framework expects
   (MCP server tool list, LangChain `Tool`, a raw OpenAI/Anthropic
   function-calling schema, whatever).

### Example: an MCP server

```ts
import { runSearchMarket, summarizeSearchMarket } from './core/search-market.ts'

server.tool(
  'search_market',
  'Search Polymarket for markets matching a free-text query.',
  { query: z.string(), limit: z.number().optional() },
  async ({ query, limit }) => {
    const result = await runSearchMarket({ query, limit }, { signal: new AbortController().signal })
    return { content: [{ type: 'text', text: summarizeSearchMarket({ query, limit }, result) }] }
  },
)
```

That's the whole adapter — `runSearchMarket` still does every bit of the
actual work (calling Gamma's `/public-search`, enriching results).

### Example already in this repo: `resolver-plugin`

`resolver-plugin/index.js` is a second, independent illustration of the same
idea, built for a different purpose: an agent that reads a market's
resolution rules and writes a verdict, rather than just researching it. It
defines two of its own tools directly with `defineTool` (`@deepseek-ai/
dsh-tools`, so it's a deepseek-harness plugin, not a portable core module the
way `tool-polymarket/core` is):

- `fetch_market(market_id)` — fetches a market's question + rules text from
  Gamma and returns it along with a `rules_hash` (sha256 of the rules text,
  so a verdict can be checked against the exact rules it was written for).
- `write_verdict(verdict_json)` — writes the agent's verdict JSON to
  `output.json` in the working directory.

To port `resolver-plugin` to another harness, apply the same split as
`tool-polymarket`: pull `fetch_market`'s Gamma-fetching logic into a
framework-agnostic function (it could literally reuse
`market-resolution-criteria.ts`'s `getMarket()` call from `tool-polymarket`
instead of duplicating it), and keep only the `defineTool` wiring as the
harness-specific adapter.

## What does *not* port

- `tools/*.ts` and `index.ts` — deepseek-harness's `defineTool`/cordis
  wiring. Replace, don't copy.
- The `presets/polymarket-research/` persona config — that's a cordis agent
  preset (persona text + tool visibility), specific to how deepseek-harness
  boots an agent. Reimplement the persona prompt for your framework; the
  prompt text itself (in `agent.cordis.yml`) is plain English and copies
  over fine even though the YAML structure doesn't.
- The `presentationMeta`/`render` hints in `tools/*.ts` — those feed
  deepseek-harness's chat UI widgets (`ui-polymarket`). A different harness
  either renders `summarize*`'s plain-text output as-is, or writes its own
  UI layer against the same `run*` output shape.

## Caveats to carry over regardless of harness

- `getOrderBook()` sorts bids descending / asks ascending internally — do
  not re-read the raw CLOB `/book` response yourself and assume index `[0]`
  is the best price; the upstream API does not guarantee that.
- `market_order_ticket` and `market_position_summary` are mock previews.
  Whatever harness you port this to, keep surfacing that explicitly — this
  package never signs, submits, or sizes a real order.
