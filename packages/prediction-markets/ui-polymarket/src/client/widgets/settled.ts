import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'

/**
 * Narrows a Polymarket toolview's settled `meta` payload (the exact structured
 * value `output.presentationMeta` returned on the host), or `undefined` while
 * the call is still running or carried no meta (an error result, for example).
 */
// T is set explicitly by callers to narrow `meta`, not inferred from args.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function polymarketResult<T>(block: ToolCallViewProps['block']): T | undefined {
  if (!('kind' in block)) return undefined
  if (block.isError) return undefined
  return block.meta as T | undefined
}

/** Whether the call is still running (no settled result yet). */
export function isPending(block: ToolCallViewProps['block']): boolean {
  return !('kind' in block)
}
