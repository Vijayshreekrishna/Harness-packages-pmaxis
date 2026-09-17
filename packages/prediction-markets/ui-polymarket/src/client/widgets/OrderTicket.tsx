import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import css from './widget.module.css'
import { isPending, polymarketResult } from './settled.ts'

interface OrderTicketResult {
  marketId: string
  question: string
  outcome: string
  side: 'buy' | 'sell'
  bestBid: number
  bestAsk: number
  suggestedPrice: number
  mock: boolean
}

/** Renders `market_order_ticket` results as a read-only order preview. */
export function OrderTicket({ block }: ToolCallViewProps) {
  if (isPending(block)) return <div className={css.card}><p className={css.pending}>Loading order book…</p></div>
  const result = polymarketResult<OrderTicketResult>(block)
  if (!result) return null

  return (
    <div className={css.card}>
      <span className={css.mockBadge}>Preview — not submitted</span>
      <p className={css.question}>{result.question}</p>
      <div className={css.toggleRow}>
        <span
          className={css.sideBadge}
          style={{
            color: result.side === 'buy'
              ? 'var(--dsw-alias-state-success-primary)'
              : 'var(--dsw-alias-state-error-primary)',
            background: 'var(--dsw-alias-bg-base)',
            border: '0.5px solid var(--dsw-alias-border-l2)',
          }}
        >
          {result.side} {result.outcome}
        </span>
      </div>
      <div className={css.statGrid}>
        <div className={css.statCell}>
          <span className={css.statLabel}>Best bid</span>
          <span className={`${css.statValue} ${css.positive}`}>{result.bestBid.toFixed(3)}</span>
        </div>
        <div className={css.statCell}>
          <span className={css.statLabel}>Best ask</span>
          <span className={`${css.statValue} ${css.negative}`}>{result.bestAsk.toFixed(3)}</span>
        </div>
        <div className={css.statCell}>
          <span className={css.statLabel}>Suggested</span>
          <span className={css.statValue}>{result.suggestedPrice.toFixed(3)}</span>
        </div>
      </div>
    </div>
  )
}
