/** Reserved for barge-in policy. The Retell platform handles audio interruption;
 *  this hook lets the engine know whether to suppress unsent tokens. */
export function shouldStopStreaming(opts: { interrupted: boolean; tokensSent: number }): boolean {
  return opts.interrupted && opts.tokensSent > 0;
}
