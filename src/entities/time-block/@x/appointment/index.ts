// Cross-import surface for the appointment entity (FSD @x pattern).
// Exposes only what appointment's busy-interval and availability logic needs
// from time-block.
export type { TimeBlock } from '../../model/types'
export { useTimeBlocksQuery } from '../../model/time-block.queries'
