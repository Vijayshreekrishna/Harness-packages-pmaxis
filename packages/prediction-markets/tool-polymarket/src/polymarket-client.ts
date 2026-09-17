/**
 * Thin fetch wrapper over Polymarket's public, unauthenticated REST APIs:
 * Gamma (market/event metadata and search) and CLOB (order books, price
 * history). Field shapes below were verified against live `/markets`,
 * `/markets/:id`, `/book`, and `/prices-history` responses.
 *
 * This module and everything under `./core/` have no dependency on
 * `@deepseek-ai/dsh-tools` or `@deepseek-ai/cordis` — they are plain
 * TypeScript, portable to any host. `./tools/*.ts` is the deepseek-harness
 * adapter layer: it wires `./core/*` functions into `defineTool`. A
 * different harness (an MCP server, another agent framework) reuses this
 * file plus `./core/*` and writes its own thin adapter in their place.
 * @module @deepseek-ai/dsh-tool-polymarket/polymarket-client
 */

const GAMMA_BASE_URL = 'https://gamma-api.polymarket.com'
const CLOB_BASE_URL = 'https://clob.polymarket.com'

/** One Gamma market row, as returned by `/markets` and `/markets/:id`. */
export interface RawGammaMarket {
  id: string
  question: string
  slug: string
  description?: string
  active: boolean
  closed: boolean
  /** JSON-encoded string array, e.g. `'["Yes","No"]'` — Gamma's known quirk. */
  outcomes: string
  /** JSON-encoded string array of prices aligned to `outcomes`, e.g. `'["0.63","0.37"]'`. */
  outcomePrices: string
  /** JSON-encoded string array of CLOB token ids aligned to `outcomes`. */
  clobTokenIds?: string
  volume?: string
  liquidity?: string
  endDate?: string
  startDate?: string
  resolutionSource?: string
  updatedAt?: string
}

export interface PolymarketOutcome {
  label: string
  probability: number
  clobTokenId: string | null
}

export interface PolymarketMarket {
  marketId: string
  question: string
  slug: string
  active: boolean
  closed: boolean
  outcomes: PolymarketOutcome[]
  description: string | null
  resolutionSource: string | null
  endDate: string | null
  volume: number | null
  liquidity: number | null
}

/** Parses one of Gamma's JSON-encoded-string array fields; empty on any mismatch. */
function parseJsonStringArray(raw: string | undefined): string[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function toMarket(raw: RawGammaMarket): PolymarketMarket {
  const labels = parseJsonStringArray(raw.outcomes)
  const prices = parseJsonStringArray(raw.outcomePrices)
  const tokenIds = parseJsonStringArray(raw.clobTokenIds)
  const outcomes: PolymarketOutcome[] = labels.map((label, i) => ({
    label,
    probability: Number(prices[i] ?? '0'),
    clobTokenId: tokenIds[i] ?? null,
  }))
  return {
    marketId: raw.id,
    question: raw.question,
    slug: raw.slug,
    active: raw.active,
    closed: raw.closed,
    outcomes,
    description: raw.description ?? null,
    resolutionSource: raw.resolutionSource ?? null,
    endDate: raw.endDate ?? null,
    volume: raw.volume === undefined ? null : Number(raw.volume),
    liquidity: raw.liquidity === undefined ? null : Number(raw.liquidity),
  }
}

async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal })
  if (!res.ok) {
    throw new Error(`polymarket: ${url} responded ${String(res.status)} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

interface RawPublicSearchResponse {
  events: { markets?: RawGammaMarket[] }[]
}

/**
 * Search active markets by free text.
 *
 * `/markets?q=` looks like a full-text filter but silently ignores `q` and
 * returns generic trending markets regardless of query — verified live: a
 * query for "Fed rate cut" and one for "Xi Jinping" returned the identical
 * three results. `/public-search` is Polymarket's actual search endpoint (it
 * backs their own search bar); it returns matching events, each carrying its
 * own `markets` array in the same row shape `/markets` uses, so `toMarket`
 * applies unchanged. Events are flattened in the relevance order the API
 * returns; a matched event (e.g. one Fed meeting date per outcome) commonly
 * mixes still-open and long-resolved sub-markets, so open ones sort first
 * (stable within each group) before truncating to `limit`.
 */
export async function searchMarkets(
  query: string, limit: number, signal: AbortSignal,
): Promise<PolymarketMarket[]> {
  const url = new URL('/public-search', GAMMA_BASE_URL)
  url.searchParams.set('q', query)
  url.searchParams.set('limit_per_type', String(limit))
  url.searchParams.set('events_status', 'active')
  const raw = await getJson<RawPublicSearchResponse>(url.toString(), signal)
  const markets = raw.events.flatMap(event => event.markets ?? [])
  const open = markets.filter(m => !m.closed)
  const closed = markets.filter(m => m.closed)
  return [...open, ...closed].slice(0, limit).map(toMarket)
}

/** Fetches one market's full Gamma detail by id. */
export async function getMarket(marketId: string, signal: AbortSignal): Promise<PolymarketMarket> {
  const url = new URL(`/markets/${encodeURIComponent(marketId)}`, GAMMA_BASE_URL)
  const raw = await getJson<RawGammaMarket>(url.toString(), signal)
  return toMarket(raw)
}

export interface OrderBookLevel {
  price: number
  size: number
}

export interface OrderBook {
  bids: OrderBookLevel[]
  asks: OrderBookLevel[]
}

interface RawClobBook {
  bids: { price: string; size: string }[]
  asks: { price: string; size: string }[]
}

/** Fetches the live CLOB order book for one outcome's token id. */
export async function getOrderBook(clobTokenId: string, signal: AbortSignal): Promise<OrderBook> {
  const url = new URL('/book', CLOB_BASE_URL)
  url.searchParams.set('token_id', clobTokenId)
  const raw = await getJson<RawClobBook>(url.toString(), signal)
  return {
    bids: raw.bids.map(l => ({ price: Number(l.price), size: Number(l.size) })),
    asks: raw.asks.map(l => ({ price: Number(l.price), size: Number(l.size) })),
  }
}

export interface PricePoint {
  t: string
  price: number
}

interface RawPricesHistory {
  history: { t: number; p: number }[]
}

const INTERVAL_FIDELITY: Record<string, number> = {
  '1h': 1, '6h': 5, '1d': 10, '1w': 60, max: 1440,
}

/** Fetches CLOB price history for one outcome's token id. */
export async function getPriceHistory(
  clobTokenId: string, interval: string, signal: AbortSignal,
): Promise<PricePoint[]> {
  const url = new URL('/prices-history', CLOB_BASE_URL)
  url.searchParams.set('market', clobTokenId)
  url.searchParams.set('interval', interval)
  url.searchParams.set('fidelity', String(INTERVAL_FIDELITY[interval] ?? 10))
  const raw = await getJson<RawPricesHistory>(url.toString(), signal)
  return raw.history.map(p => ({ t: new Date(p.t * 1000).toISOString(), price: p.p }))
}

/** Finds one named outcome (case-insensitive) on a market, or its first outcome. */
export function pickOutcome(market: PolymarketMarket, outcome?: string): PolymarketOutcome {
  const found = outcome === undefined
    ? undefined
    : market.outcomes.find(o => o.label.toLowerCase() === outcome.toLowerCase())
  const picked = found ?? market.outcomes[0]
  if (!picked) throw new Error(`polymarket: market ${market.marketId} has no outcomes`)
  return picked
}
