/**
 * Polymarket widget plugin, node half. The empty apply keeps the browser-only
 * feature addressable from the host-owned Loader overlay; the widgets
 * themselves live in `./client/index.ts`.
 */

/** Host plugin body — Polymarket widget behavior exists only in the browser entry. */
export function apply(): void {}
