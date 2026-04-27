export function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

export function assertNever(x: never, msg = "Unexpected variant"): never {
  throw new Error(`${msg}: ${JSON.stringify(x)}`);
}
