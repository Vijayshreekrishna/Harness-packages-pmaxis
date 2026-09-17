# How `tool-polymarket` works

`tool-polymarket` gives an agent read-only research tools over Polymarket's
public REST APIs: search, market grouping, price history, live order books,
executed trades, resolution rules text, public sentiment, and real wallet
lookups. No trading, no private keys, no wallet held by the agent — every
call hits Polymarket's public, unauthenticated endpoints, and **every result
is real data fetched live**. Nothing is mocked, simulated, or invented.

## Layered architecture

The package is split into three layers, in order of decreasing portability:

```
polymarket-client.ts   <- talks to Polymarket's REST APIs, no framework deps
core/*.ts              <- one run*/summarize* pair per tool, no framework deps
tools/*.ts             <- deepseek-harness adapter: wraps core/* in defineTool
index.ts               <- cordis plugin: registers the eight tools + ships a preset
```

**`polymarket-client.ts`** is the only file that makes network calls. It
wraps three upstream APIs:

- **Gamma API** (`https://gamma-api.polymarket.com`) — market/event metadata:
  question text, description/rules, outcomes, prices, volume, liquidity,
  resolution source, end date, event grouping, and public comments.
  `searchMarkets()` calls Gamma's `/public-search` endpoint (the one
  Polymarket's own search bar uses — the `/markets?q=` parameter is a
  documented no-op that ignores the query).
- **CLOB API** (`https://clob.polymarket.com`) — live order books
  (`/book`) and price history (`/prices-history`) for one outcome's token id.
- **Data API** (`https://data-api.polymarket.com`) — public on-chain-indexed
  activity: executed trades for a market, and any wallet address's real
  positions and activity history.

**`core/*.ts`** holds the actual logic for each tool as a plain
`run*(args, { signal }) -> Promise<Output>` function plus a
`summarize*(args, value) -> string` function that renders one line of text.
Neither depends on `@deepseek-ai/dsh-tools` or `@deepseek-ai/cordis` — see
[using-tool-polymarket-in-another-harness.md](./using-tool-polymarket-in-another-harness.md)
for why that matters (including whether this is MCP-connectable).

**`tools/*.ts`** is the only framework-specific layer: it wraps each `core/*`
pair in `defineTool` — JSON-schema parameters/output, presentation hints for
the chat UI, and registration on the cordis `tools` service.

## The eight tools

| Tool | What it does | Backed by |
|---|---|---|
| `search_market` | Primary entry point. Free-text query -> ranked markets, each already enriched with probability, volume, liquidity, resolution date/source. Call this first. | Gamma `/public-search` |
| `market_group` | Every sibling market under the same event (e.g. every FOMC-meeting-date market under one "How many Fed rate cuts in 2026?" event) — the exact set, not a fuzzy search match. | Gamma `/markets` + `/events` |
| `market_price_chart` | Time-series of one outcome's implied probability. | CLOB `/prices-history` |
| `market_quote` | The real, current order book for one outcome: best bid, best ask, spread, midpoint, and depth on both sides. Not a trade preview — one fetch, both sides, no "side" parameter. | CLOB `/book` |
| `market_trades` | Recently *executed* trades (real fills: price, size, side, time) — distinct from `market_quote`'s resting, unfilled orders. Tells you whether a market is actually trading. | Data API `/trades` |
| `market_resolution_criteria` | Full rules text for one market: exactly how/when it resolves and by what source. | Gamma `/markets/:id` |
| `market_sentiment` | Real public discussion comments on the market's event. | Gamma `/comments` |
| `wallet_summary` | A real public wallet address's current positions **and** recent activity, in one call. | Data API `/positions` + `/activity` |

`search_market` is the only tool most questions need — it returns
probability/volume/liquidity/resolution info for every result in one call.
The other tools exist for when you already have a `marketId` (or a wallet
address) and need something search doesn't return.

## Design choices worth knowing about

**No mock data, anywhere.** Two earlier tools were cut/replaced because they
couldn't satisfy this:

- `market_order_ticket` (removed) forced a `side` parameter and framed its
  output as a trade "preview." It's now `market_quote`: the same order-book
  fetch, but returned as what it actually is — a live market quote, both
  sides, no preview framing, no `side` argument needed.
- `market_position_summary` (removed) asked the model to invent a
  hypothetical position (a shares count and average price the model made
  up) and compute fictional P&L on it. It's replaced by `wallet_summary`,
  which reports a *real* wallet address's actual positions and P&L — real
  data instead of a fabricated scenario.
- `market_probability_gauge` (removed, not mock-related) was cut for a
  different reason: it duplicated the `outcomes`/`probability` fields
  `search_market` already returns per result. One tool per genuinely
  different task, not one tool per field.

**One tool per legitimate task, not one tool per API field or per trivial
action.** There is no separate `market_volume`, `market_bid`, or
`market_ask` tool — those are fields already riding inside `search_market`
and `market_quote`'s responses, not distinct tasks. `wallet_summary`
combines positions + activity into one tool rather than two, because a
caller asking "what does this wallet hold" almost always wants both in the
same breath.

## A fixed bug worth knowing about

`getOrderBook()` originally trusted the CLOB API's array order and read index
`[0]` as the best price. In practice the API returns **bids ascending and
asks descending** (both worst-price-first), so `market_quote` (and its
predecessor `market_order_ticket`) showed the *worst* price in the book (bid
≈0.01 / ask ≈0.99) regardless of the real market. `getOrderBook` now
explicitly sorts bids descending and asks ascending before returning, so
`bids[0]`/`asks[0]` are genuinely the best price. Covered by
`tests/polymarket-client.spec.ts`.

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
  market_group(marketId)                -- Gamma /markets + /events
  market_resolution_criteria(marketId)  -- Gamma /markets/:id
  market_price_chart(marketId)          -- CLOB /prices-history
  market_quote(marketId)                -- CLOB /book
  market_trades(marketId)               -- Data API /trades
  market_sentiment(marketId)            -- Gamma /comments
  wallet_summary(address)               -- Data API /positions + /activity
```

## Testing it live

`tests/polymarket-client.spec.ts` (vitest) covers the order-book sort
regression with mocked responses. To exercise every tool against real live
data (no agent needed), call the `core/*` functions directly from a `tsx`
script — every function in this doc's table has a matching `run*`/`summarize*`
pair in `core/`. Or launch the DSH web app (`pnpm dsh web`) and select the
**Polymarket Research** persona to drive it through an actual model.
