/**
 * @param residualDelayMs How much time into the update we are in.
 * In other words, how late the current update was at the time this event was created.
 */
export type UpdateHandler = (residualDelayMs: number) => void;
