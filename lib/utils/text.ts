export function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function lower(s: string): string {
  return s.toLowerCase();
}

const WORD_NUMBERS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1_000,
  million: 1_000_000,
};

/** Convert simple word-number phrases ("thirty-five hundred") into digits. */
export function wordsToNumbers(input: string): string {
  const tokens = input.toLowerCase().split(/[\s-]+/);
  const out: string[] = [];
  let acc = 0;
  let touched = false;
  let buf: string[] = [];
  const flush = () => {
    if (touched) out.push(String(acc));
    out.push(...buf);
    acc = 0;
    touched = false;
    buf = [];
  };
  for (const t of tokens) {
    if (t in WORD_NUMBERS) {
      const n = WORD_NUMBERS[t]!;
      touched = true;
      if (n === 100 || n === 1000 || n === 1_000_000) {
        acc = (acc || 1) * n;
      } else {
        acc += n;
      }
    } else {
      flush();
      buf.push(t);
    }
  }
  flush();
  return out.join(" ");
}
