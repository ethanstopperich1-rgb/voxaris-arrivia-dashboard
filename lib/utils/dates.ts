export function nowIso(): string {
  return new Date().toISOString();
}

export function ms(): number {
  return Date.now();
}

export function elapsedMs(start: number): number {
  return Date.now() - start;
}
