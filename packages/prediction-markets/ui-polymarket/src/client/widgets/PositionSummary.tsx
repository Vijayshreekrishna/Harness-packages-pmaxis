import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import css from './widget.module.css'
import { isPending, polymarketResult } from './settled.ts'

interface PositionSummaryResult {
  marketId: string
  outcome: string
  shares: number
  avgPrice: number
  currentPrice: number
  currentValue: number
  pnl: number
  mock: boolean
}

/** Renders `market_position_summary` results as a sample P&L card. */
export function PositionSummary({ block }: ToolCallViewProps) {
  if (isPending(block)) return <div className={css.card}><p className={css.pending}>Pricing sample position…</p></div>
  const result = polymarketResult<PositionSummaryResult>(block)
  if (!result) return null
  const pnlPositive = result.pnl >= 0

  return (
    <div className={css.card}>
      <span className={css.mockBadge}>Sample — no wallet linked</span>
      <div className={css.outcomeRow}>
        <span className={css.outcomePct}>${result.currentValue.toFixed(2)}</span>
        <span className={`${css.statValue} ${pnlPositive ? css.positive : css.negative}`}>
          {pnlPositive ? '+' : ''}{result.pnl.toFixed(2)}
        </span>
      </div>
      <span className={css.outcomeLabel}>{result.outcome}</span>
      <div className={css.statGrid}>
        <div className={css.statCell}>
          <span className={css.statLabel}>Shares</span>
          <span className={css.statValue}>{result.shares}</span>
        </div>
        <div className={css.statCell}>
          <span className={css.statLabel}>Avg price</span>
          <span className={css.statValue}>{result.avgPrice.toFixed(3)}</span>
        </div>
        <div className={css.statCell}>
          <span className={css.statLabel}>Current</span>
          <span className={css.statValue}>{result.currentPrice.toFixed(3)}</span>
        </div>
      </div>
    </div>
  )
}
