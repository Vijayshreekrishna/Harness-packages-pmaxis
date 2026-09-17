# Using `tool-polymarket` (and `resolver-plugin`) in a different harness

`tool-polymarket` was built inside `deepseek-harness`, but the Polymarket
logic itself has zero dependency on it. This doc explains what's portable,
what isn't, and how to wire it into another agent framework, an MCP server,
or a plain script — using `resolver-plugin` (also in this repo) as a worked
second example of the same pattern.

## Is this reachable via MCP while it's inside deepseek-harness? No.

`tool-polymarket`'s tools register on the harness's own internal tool
registry (cordis `ctx.tools`) — that registry is not exposed outward.
`deepseek-harness` ships an MCP **client** (`packages/mcp/mcp-client`,
"connects to MCP servers and registers their tools on `ctx.tools`") and an
ACP layer that mounts external MCP servers into the harness the same way,
but there is no MCP **server** package anywhere in the repo that would take
the harness's own tools (this one included) and expose them outward to an
external MCP client such as Claude Desktop or another agent. Being inside
`deepseek-harness` does not make a tool MCP-reachable by itself.

To actually make `tool-polymarket` reachable over MCP, don't try to expose
the harness — stand up a small separate MCP server (using
`@modelcontextprotocol/sdk`) that imports the portable `core/*.ts` functions
directly. That's exactly the pattern in the next section: `core/*.ts` has no
framework dependency, so it's just as usable from a purpose-built MCP server
as it is from `deepseek-harness`'s own `tools/*.ts` adapter.

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
- Every tool in this package returns only real data fetched live from
  Polymarket — none of them mock, preview, or invent a trade, a position, or
  a price. `market_quote` is a real order-book read, not a trade you're
  placing; `wallet_summary` only ever reports what a real, caller-supplied
  wallet address actually holds and did, never a hypothetical scenario. Keep
  that property whatever harness you port this to — it's a design
  constraint, not an accident.
