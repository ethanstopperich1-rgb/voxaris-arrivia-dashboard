import { env } from "@/lib/config/env";

export interface RimeGenerateOptions {
  text: string;
  voiceId: string;
  speedAlpha?: number;         // 1.0 = natural pace
  sampleRate?: number;         // 22050 for Drop Cowboy compat
  reduceLatency?: boolean;
}

export class RimeClient {
  private readonly apiKey: string;
  private readonly baseUrl = "https://users.rime.ai/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(opts: RimeGenerateOptions): Promise<Buffer> {
    const { text, voiceId, speedAlpha = 1.0, sampleRate = 22050 } = opts;

    const resp = await fetch(`${this.baseUrl}/rime-tts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        Accept: "audio/mp3",
      },
      body: JSON.stringify({
        speaker: voiceId,
        text,
        modelId: "mist",
        speedAlpha,
        samplingRate: sampleRate,
        audioFormat: "mp3",
      }),
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      throw new Error(`Rime API error ${resp.status}: ${body}`);
    }

    const arrayBuf = await resp.arrayBuffer();
    return Buffer.from(arrayBuf);
  }
}

let _client: RimeClient | null = null;

export function rimeClient(): RimeClient {
  if (_client) return _client;
  const apiKey = env().RIME_API_KEY;
  if (!apiKey) throw new Error("RIME_API_KEY is not set");
  _client = new RimeClient(apiKey);
  return _client;
}
