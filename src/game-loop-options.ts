/**
 * Additional opts for customizing game loop behavior.
 */
export interface GameLoopOptions {
  /**
   * Specifies the maximum amount of residual delay the loop can accrue.
   * This is important to prevent the loop from completely hanging if the
   * game's update function ever reaches a point where it takes longer
   * to execute than the update frequency.
   */
  delayClampMs?: number;
}
