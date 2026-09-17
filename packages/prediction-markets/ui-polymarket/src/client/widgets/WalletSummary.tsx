import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import css from './widget.module.css'
import { isPending, polymarketResult } from './settled.ts'

interface WalletPosition {
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

interface WalletSummaryResult {
  address: string
  positions: WalletPosition[]
  recentActivity: unknown[]
}

/** Renders `wallet_summary` results: a real public wallet's actual positions. */
export function WalletSummary({ block }: ToolCallViewProps) {
  if (isPending(block)) return <div className={css.card}><p className={css.pending}>Loading wallet…</p></div>
  const result = polymarketResult<WalletSummaryResult>(block)
  if (!result) return null

  return (
    <div className={css.card}>
      <p className={css.question}>{result.address}</p>
      {result.positions.length === 0
        ? <p className={css.pending}>No public positions found.</p>
        : result.positions.map(p => (
          <div className={css.outcomeRow} key={`${p.title}-${p.outcome}`}>
            <span className={css.outcomeLabel}>{p.title} ({p.outcome})</span>
            <span className={`${css.statValue} ${p.cashPnl >= 0 ? css.positive : css.negative}`}>
              {p.cashPnl >= 0 ? '+' : ''}{p.cashPnl.toFixed(2)}
            </span>
          </div>
        ))}
    </div>
  )
}
