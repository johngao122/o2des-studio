/**
 * Shared constants for orthogonal edge routing behaviour.
 */

/**
 * Pixel tolerance used when aligning nearly collinear segments in orthogonal paths.
 * Keeping this value consistent across routing and simplification prevents slight
 * drags (< tolerance) from introducing unintended bends when edges are recalculated.
 */
export const ORTHOGONAL_ALIGNMENT_TOLERANCE = 6;

