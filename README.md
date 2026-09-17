# Harness Packages — Polymarket / Resolver

Source snapshot of three packages pulled out of `deepseek-harness`:

- `packages/prediction-markets/tool-polymarket` — read-only Polymarket research tools (search, market grouping, resolution criteria, price chart, live order book, recent trades, sentiment, wallet lookup) over the public Gamma/CLOB/Data REST APIs. All real data — no mocked/simulated results.
- `packages/prediction-markets/ui-polymarket` — browser widgets rendering the above tools' output.
- `packages/resolver-plugin` — `fetch_market` + `write_verdict` tools for an agent that resolves a market's outcome from its rules text.

## Status

This is a **source-only reference snapshot**, not a standalone buildable project. These packages depend on internal `@deepseek-ai/*` workspace libraries (`cordis`, `schemastery`, `dsh-tools`, `dsh-agent`, `dsh-client-*`) that only resolve inside the `deepseek-harness` monorepo's pnpm workspace — there is no root `package.json`/lockfile/build config here, and `node_modules`/`lib` build output were excluded.

To build or run these, copy them back into a `deepseek-harness` checkout under `packages/`.

## Docs

- [docs/tool-polymarket.md](./docs/tool-polymarket.md) — how `tool-polymarket` works: architecture, the eight tools, why the mock-data tools were cut, data flow, a fixed order-book sorting bug.
- [docs/using-tool-polymarket-in-another-harness.md](./docs/using-tool-polymarket-in-another-harness.md) — whether this is reachable via MCP from inside deepseek-harness (no, and why), how to reuse the portable `core/*` logic (and the same pattern applied to `resolver-plugin`) in a different agent framework or MCP server.
