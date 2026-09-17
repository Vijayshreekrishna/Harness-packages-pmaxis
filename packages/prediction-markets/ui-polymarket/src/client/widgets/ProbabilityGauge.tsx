import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import css from './widget.module.css'
import { isPending, polymarketResult } from './settled.ts'

interface ProbabilityGaugeResult {
  marketId: string
  question: string
  outcomes: { label: string; probability: number }[]
  asOf: string
}

const SEGMENT_COLORS = [
  'var(--dsw-alias-state-success-primary)',
  'var(--dsw-alias-state-error-primary)',
  'var(--dsw-alias-label-tertiary)',
]

/** Renders `market_probability_gauge` results as a stacked probability bar. */
export function ProbabilityGauge({ block }: ToolCallViewProps) {
  if (isPending(block)) return <div className={css.card}><p className={css.pending}>Checking probability…</p></div>
  const result = polymarketResult<ProbabilityGaugeResult>(block)
  if (!result) return null

  return (
    <div className={css.card}>
      <p className={css.question}>{result.question}</p>
      <div className={css.barTrack}>
        {result.outcomes.map((outcome, i) => (
          <div
            key={outcome.label}
            className={css.barFill}
            style={{
              width: `${String(Math.max(0, Math.min(100, outcome.probability * 100)))}%`,
              background: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
            }}
          />
        ))}
      </div>
      {result.outcomes.map((outcome, i) => (
        <div className={css.outcomeRow} key={outcome.label}>
          <span className={css.outcomeLabel}>{outcome.label}</span>
          <span
            className={css.outcomePct}
            style={{ color: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }}
          >
            {(outcome.probability * 100).toFixed(1)}%
          </span>
        </div>
      ))}
      <span className={css.footer}>as of {result.asOf}</span>
    </div>
  )
}
