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
/** Public, unauthenticated index of on-chain activity: trades, positions, wallet activity. */
const DATA_BASE_URL = 'https://data-api.polymarket.com'

/** One Gamma market row, as returned by `/markets` and `/markets/:id`. */
export interface RawGammaMarket {
  id: string
  question: string
  slug: string
  description?: string
  active: boolean
  closed: boolean
  conditionId: string
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
  /** Present on `/markets` (list) responses; absent on `/markets/:id` (single). */
  events?: { id: string; slug: string; title?: string }[]
}

export interface PolymarketOutcome {
  label: string
  probability: number
  clobTokenId: string | null
}

export interface PolymarketMarket {
  marketId: string
  conditionId: string
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
    conditionId: raw.conditionId,
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

export interface PolymarketEventRef {
  eventId: string
  slug: string
  title: string
}

/**
 * Finds the event a market belongs to, if any. Only the list form of `/markets`
 * (`?id=`) embeds `events`; the single-resource form (`/markets/:id`, used by
 * `getMarket`) does not, so this issues its own request rather than reusing it.
 */
export async function getMarketEvent(marketId: string, signal: AbortSignal): Promise<PolymarketEventRef | null> {
  const url = new URL('/markets', GAMMA_BASE_URL)
  url.searchParams.set('id', marketId)
  const raw = await getJson<RawGammaMarket[]>(url.toString(), signal)
  const event = raw[0]?.events?.[0]
  if (!event) return null
  return { eventId: event.id, slug: event.slug, title: event.title ?? '' }
}

interface RawGammaEvent {
  id: string
  slug: string
  title: string
  markets?: RawGammaMarket[]
}

/** Fetches every sibling market grouped under one event (e.g. every FOMC-meeting date under one umbrella). */
export async function getEventMarkets(eventId: string, signal: AbortSignal): Promise<PolymarketMarket[]> {
  const url = new URL('/events', GAMMA_BASE_URL)
  url.searchParams.set('id', eventId)
  const raw = await getJson<RawGammaEvent[]>(url.toString(), signal)
  return (raw[0]?.markets ?? []).map(toMarket)
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
  // The CLOB API returns bids ascending and asks descending (both worst-price-first),
  // not best-price-first — sort so callers can safely read index 0 as the best price.
  const bids = raw.bids.map(l => ({ price: Number(l.price), size: Number(l.size) }))
    .sort((a, b) => b.price - a.price)
  const asks = raw.asks.map(l => ({ price: Number(l.price), size: Number(l.size) }))
    .sort((a, b) => a.price - b.price)
  return { bids, asks }
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

export interface MarketTrade {
  side: 'BUY' | 'SELL'
  outcome: string
  price: number
  size: number
  timestamp: string
}

interface RawDataTrade {
  side: 'BUY' | 'SELL'
  outcome: string
  price: number
  size: number
  timestamp: number
}

/** Fetches recently *executed* trades for a market (real fills), not resting order-book quotes. */
export async function getMarketTrades(
  conditionId: string, limit: number, signal: AbortSignal,
): Promise<MarketTrade[]> {
  const url = new URL('/trades', DATA_BASE_URL)
  url.searchParams.set('market', conditionId)
  url.searchParams.set('limit', String(limit))
  const raw = await getJson<RawDataTrade[]>(url.toString(), signal)
  return raw.map(t => ({
    side: t.side,
    outcome: t.outcome,
    price: Number(t.price),
    size: Number(t.size),
    timestamp: new Date(t.timestamp * 1000).toISOString(),
  }))
}

export interface WalletPosition {
  title: string
  outcome: string
  size: number
  avgPrice: number
  currentPrice: number
  currentValue: number
  cashPnl: number
  percentPnl: number
  redeemable: boolean
}

interface RawWalletPosition {
  title: string
  outcome: string
  size: number
  avgPrice: number
  curPrice: number
  currentValue: number
  cashPnl: number
  percentPnl: number
  redeemable: boolean
}

/** Fetches a public wallet address's real, currently-held Polymarket positions. */
export async function getWalletPositions(
  address: string, limit: number, signal: AbortSignal,
): Promise<WalletPosition[]> {
  const url = new URL('/positions', DATA_BASE_URL)
  url.searchParams.set('user', address)
  url.searchParams.set('limit', String(limit))
  const raw = await getJson<RawWalletPosition[]>(url.toString(), signal)
  return raw.map(p => ({
    title: p.title,
    outcome: p.outcome,
    size: Number(p.size),
    avgPrice: Number(p.avgPrice),
    currentPrice: Number(p.curPrice),
    currentValue: Number(p.currentValue),
    cashPnl: Number(p.cashPnl),
    percentPnl: Number(p.percentPnl),
    redeemable: p.redeemable,
  }))
}

export interface WalletActivityRow {
  type: string
  title: string
  outcome: string
  side: string | null
  price: number | null
  size: number | null
  timestamp: string
}

interface RawWalletActivity {
  type: string
  title: string
  outcome: string
  side?: string
  price?: number
  size?: number
  timestamp: number
}

/** Fetches a public wallet address's real recent activity (trades, redemptions, etc). */
export async function getWalletActivity(
  address: string, limit: number, signal: AbortSignal,
): Promise<WalletActivityRow[]> {
  const url = new URL('/activity', DATA_BASE_URL)
  url.searchParams.set('user', address)
  url.searchParams.set('limit', String(limit))
  const raw = await getJson<RawWalletActivity[]>(url.toString(), signal)
  return raw.map(a => ({
    type: a.type,
    title: a.title,
    outcome: a.outcome,
    side: a.side ?? null,
    price: a.price === undefined ? null : Number(a.price),
    size: a.size === undefined ? null : Number(a.size),
    timestamp: new Date(a.timestamp * 1000).toISOString(),
  }))
}

export interface MarketComment {
  author: string
  body: string
  createdAt: string
}

interface RawComment {
  body: string
  createdAt: string
  profile?: { name?: string; pseudonym?: string }
}

/** Fetches public discussion comments on an event (Polymarket threads comments per-event, not per-sub-market). */
export async function getEventComments(
  eventId: string, limit: number, signal: AbortSignal,
): Promise<MarketComment[]> {
  const url = new URL('/comments', GAMMA_BASE_URL)
  url.searchParams.set('parent_entity_type', 'Event')
  url.searchParams.set('parent_entity_id', eventId)
  url.searchParams.set('limit', String(limit))
  const raw = await getJson<RawComment[]>(url.toString(), signal)
  return raw.map(c => ({
    author: c.profile?.name || c.profile?.pseudonym || 'anonymous',
    body: c.body,
    createdAt: c.createdAt,
  }))
}
