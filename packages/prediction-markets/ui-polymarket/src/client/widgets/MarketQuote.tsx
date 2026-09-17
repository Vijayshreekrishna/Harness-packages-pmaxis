import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import css from './widget.module.css'
import { isPending, polymarketResult } from './settled.ts'

interface BookLevel {
  price: number
  size: number
}

interface MarketQuoteResult {
  marketId: string
  question: string
  outcome: string
  bestBid: number | null
  bestAsk: number | null
  spread: number | null
  midpoint: number | null
  bidDepth: BookLevel[]
  askDepth: BookLevel[]
}

/** Renders `market_quote` results: the real, live order book — no preview/mock framing. */
export function MarketQuote({ block }: ToolCallViewProps) {
  if (isPending(block)) return <div className={css.card}><p className={css.pending}>Loading order book…</p></div>
  const result = polymarketResult<MarketQuoteResult>(block)
  if (!result) return null

  return (
    <div className={css.card}>
      <p className={css.question}>{result.question} — {result.outcome}</p>
      {result.bestBid === null && result.bestAsk === null
        ? <p className={css.pending}>No live order book.</p>
        : (
          <div className={css.statGrid}>
            <div className={css.statCell}>
              <span className={css.statLabel}>Best bid</span>
              <span className={`${css.statValue} ${css.positive}`}>
                {result.bestBid === null ? '—' : result.bestBid.toFixed(3)}
              </span>
            </div>
            <div className={css.statCell}>
              <span className={css.statLabel}>Best ask</span>
              <span className={`${css.statValue} ${css.negative}`}>
                {result.bestAsk === null ? '—' : result.bestAsk.toFixed(3)}
              </span>
            </div>
            <div className={css.statCell}>
              <span className={css.statLabel}>Midpoint</span>
              <span className={css.statValue}>{result.midpoint === null ? '—' : result.midpoint.toFixed(3)}</span>
            </div>
            <div className={css.statCell}>
              <span className={css.statLabel}>Spread</span>
              <span className={css.statValue}>{result.spread === null ? '—' : result.spread.toFixed(3)}</span>
            </div>
          </div>
        )}
    </div>
  )
}
