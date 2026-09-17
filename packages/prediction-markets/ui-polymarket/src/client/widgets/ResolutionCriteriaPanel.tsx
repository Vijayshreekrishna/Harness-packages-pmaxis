import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import css from './widget.module.css'
import { isPending, polymarketResult } from './settled.ts'

interface ResolutionCriteriaResult {
  marketId: string
  question: string
  rules: string
  resolutionSource: string | null
  endDate: string | null
}

/** Renders `market_resolution_criteria` results as a rules/source/date panel. */
export function ResolutionCriteriaPanel({ block }: ToolCallViewProps) {
  if (isPending(block)) return <div className={css.card}><p className={css.pending}>Loading resolution criteria…</p></div>
  const result = polymarketResult<ResolutionCriteriaResult>(block)
  if (!result) return null

  return (
    <div className={css.card}>
      <p className={css.question}>{result.question}</p>
      <p className={css.rulesText}>{result.rules}</p>
      <div className={css.outcomeRow}>
        <span className={css.statLabel}>Resolution source</span>
        <span className={css.footer}>{result.resolutionSource ?? 'not specified'}</span>
      </div>
      <div className={css.outcomeRow}>
        <span className={css.statLabel}>Market ends</span>
        <span className={css.footer}>{result.endDate ?? 'not specified'}</span>
      </div>
    </div>
  )
}
