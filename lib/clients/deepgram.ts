import { env } from "@/lib/config/env";

export interface DeepgramTranscribeResult {
  transcript: string;
  confidence: number;
  words: Array<{ word: string; start: number; end: number; confidence: number }>;
}

export class DeepgramClient {
  private readonly apiKey: string;
  private readonly baseUrl = "https://api.deepgram.com/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async transcribeBuffer(
    audioBuffer: Buffer,
    mimeType = "audio/mp3"
  ): Promise<DeepgramTranscribeResult> {
    const resp = await fetch(
      `${this.baseUrl}/listen?model=nova-3&smart_format=false&utterances=false`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${this.apiKey}`,
          "Content-Type": mimeType,
        },
        body: audioBuffer as BodyInit,
      }
    );

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      throw new Error(`Deepgram API error ${resp.status}: ${body}`);
    }

    const data = await resp.json();
    const alt = data?.results?.channels?.[0]?.alternatives?.[0];

    if (!alt) {
      throw new Error("Deepgram returned no transcription alternatives");
    }

    return {
      transcript: alt.transcript ?? "",
      confidence: alt.confidence ?? 0,
      words: alt.words ?? [],
    };
  }
}

let _client: DeepgramClient | null = null;

export function deepgramClient(): DeepgramClient {
  if (_client) return _client;
  const apiKey = env().DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error("DEEPGRAM_API_KEY is not set");
  _client = new DeepgramClient(apiKey);
  return _client;
}
