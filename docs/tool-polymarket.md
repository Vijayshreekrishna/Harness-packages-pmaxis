# How `tool-polymarket` works

`tool-polymarket` gives an agent read-only research tools over Polymarket's
public REST APIs: search, live probabilities, price history, order-book
previews, resolution rules text, and a mock position summary. No trading, no
private keys, no wallet — every call hits Polymarket's public, unauthenticated
endpoints.

## Layered architecture

The package is split into three layers, in order of decreasing portability:

```
polymarket-client.ts   <- talks to Polymarket's REST APIs, no framework deps
core/*.ts              <- one run*/summarize* pair per tool, no framework deps
tools/*.ts             <- deepseek-harness adapter: wraps core/* in defineTool
index.ts               <- cordis plugin: registers the six tools + ships a preset
```

**`polymarket-client.ts`** is the only file that makes network calls. It wraps
two upstream APIs:

- **Gamma API** (`https://gamma-api.polymarket.com`) — market/event metadata:
  question text, description/rules, outcomes, prices, volume, liquidity,
  resolution source, end date. `searchMarkets()` calls Gamma's
  `/public-search` endpoint (the one Polymarket's own search bar uses — the
  `/markets?q=` parameter is a documented no-op that ignores the query).
- **CLOB API** (`https://clob.polymarket.com`) — live order books
  (`/book`) and price history (`/prices-history`) for one outcome's token id.

**`core/*.ts`** holds the actual logic for each tool as a plain
`run*(args, { signal }) -> Promise<Output>` function plus a
`summarize*(args, value) -> string` function that renders one line of text.
Neither depends on `@deepseek-ai/dsh-tools` or `@deepseek-ai/cordis` — see
[using-tool-polymarket-in-another-harness.md](./using-tool-polymarket-in-another-harness.md)
for why that matters.

**`tools/*.ts`** is the only framework-specific layer: it wraps each `core/*`
pair in `defineTool` — JSON-schema parameters/output, presentation hints for
the chat UI, and registration on the cordis `tools` service.

## The six tools

| Tool | What it does | Backed by |
|---|---|---|
| `search_market` | Primary entry point. Free-text query -> ranked markets, each already enriched with probability, volume, liquidity, resolution date/source. Call this first. | Gamma `/public-search` |
| `market_resolution_criteria` | Full rules text for one market: exactly how/when it resolves and by what source. | Gamma `/markets/:id` |
| `market_price_chart` | Time-series of one outcome's implied probability. | CLOB `/prices-history` |
| `market_probability_gauge` | Current probability per outcome, as of now. | Gamma `/markets/:id` |
| `market_order_ticket` | **Mock** buy/sell preview: best bid/ask and a suggested price. Never submits an order. | CLOB `/book` |
| `market_position_summary` | **Mock** P&L for a hypothetical position (shares/avg price you supply). | Gamma + CLOB `/book` |

`search_market` is the only tool most questions need — it returns everything
`market_probability_gauge` would, plus volume/liquidity/resolution info, in
one call. The other `market_*` tools exist for when you already have a
`marketId` and need something search doesn't return: the full rules text, a
price series, or a live order book.

`market_order_ticket` and `market_position_summary` are explicitly previews —
the persona prompt in `presets/polymarket-research/agent.cordis.yml`
instructs the model to say so out loud whenever it shows one, and this
package never places real trades or touches a wallet.

## A fixed bug worth knowing about

`getOrderBook()` originally trusted the CLOB API's array order and read index
`[0]` as the best price. In practice the API returns **bids ascending and
asks descending** (both worst-price-first), so every order ticket showed the
*worst* price in the book (bid ≈0.01 / ask ≈0.99) regardless of the real
market. `getOrderBook` now explicitly sorts bids descending and asks
ascending before returning, so `bids[0]`/`asks[0]` are genuinely the best
price. This also fixed `market_position_summary`'s mid-price calculation,
which reads the same two indices.

## Data flow for a typical question

```
"Will the Fed cut rates in October?"
        |
        v
  search_market("Fed rate cut")         -- Gamma /public-search
        |
        v
  ranked list of markets w/ marketId, probability, volume, endDate
        |
        v  (only if the user wants more detail on one market)
  market_resolution_criteria(marketId)  -- Gamma /markets/:id
  market_price_chart(marketId)          -- CLOB /prices-history
  market_order_ticket(marketId, side)   -- CLOB /book
```

## Testing it live

There's a `tests/polymarket-client.spec.ts` vitest suite covering the order
book sort regression. To exercise the tools against real live data (no agent
needed), call the `core/*` functions directly from a `tsx` script — see the
package README/AGENTS notes for the exact snippet — or launch the DSH web app
(`pnpm dsh web`) and select the **Polymarket Research** persona to drive it
through an actual model.
