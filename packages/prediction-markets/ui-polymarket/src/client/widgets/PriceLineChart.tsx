import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import css from './widget.module.css'
import { isPending, polymarketResult } from './settled.ts'

interface PriceChartResult {
  marketId: string
  question: string
  outcome: string
  series: { t: string; price: number }[]
}

const VIEW_WIDTH = 240
const VIEW_HEIGHT = 48
const PAD = 3

/** Builds an SVG polyline `points` attribute from a price series, normalized to the viewBox. */
function toPoints(series: { price: number }[]): string {
  if (series.length === 0) return ''
  const prices = series.map(p => p.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const span = max - min || 1
  return series
    .map((point, i) => {
      const x = PAD + (i / Math.max(1, series.length - 1)) * (VIEW_WIDTH - PAD * 2)
      const y = VIEW_HEIGHT - PAD - ((point.price - min) / span) * (VIEW_HEIGHT - PAD * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

/** Renders `market_price_chart` results as a compact SVG sparkline. */
export function PriceLineChart({ block }: ToolCallViewProps) {
  if (isPending(block)) return <div className={css.card}><p className={css.pending}>Loading price history…</p></div>
  const result = polymarketResult<PriceChartResult>(block)
  if (!result) return null
  const last = result.series.at(-1)
  const first = result.series[0]
  const trendUp = last && first ? last.price >= first.price : true

  return (
    <div className={css.card}>
      <p className={css.question}>{result.question} — {result.outcome}</p>
      {result.series.length === 0
        ? <p className={css.pending}>No price history available.</p>
        : (
          <svg
            className={css.sparkline}
            viewBox={`0 0 ${String(VIEW_WIDTH)} ${String(VIEW_HEIGHT)}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={`Price history for ${result.outcome}`}
          >
            <polyline
              points={toPoints(result.series)}
              fill="none"
              strokeWidth={2}
              stroke={trendUp
                ? 'var(--dsw-alias-state-success-primary)'
                : 'var(--dsw-alias-state-error-primary)'}
            />
          </svg>
        )}
      {last && (
        <span className={css.footer}>
          {String(result.series.length)} points, latest {last.price.toFixed(3)} at {last.t}
        </span>
      )}
    </div>
  )
}
