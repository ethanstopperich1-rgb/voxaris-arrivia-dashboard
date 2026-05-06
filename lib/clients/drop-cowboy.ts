import { env } from "@/lib/config/env";

export interface DropCowboyDropPayload {
  audioUrl: string;             // publicly accessible MP3 URL
  phoneNumbers: string[];       // E.164
  campaignName: string;
  callbackNumber: string;       // CNAM / from number
  scheduledAt?: string;         // ISO 8601; omit for immediate
}

export interface DropCowboyDropResult {
  dropId: string;
  status: "queued" | "rejected";
  rejectedNumbers?: string[];
  estimatedCostUsd?: number;
}

export interface DropCowboyStatusResult {
  dropId: string;
  status: "pending" | "delivered" | "failed" | "rejected";
  deliveredAt?: string;
  failureReason?: string;
}

export class DropCowboyClient {
  private readonly apiKey: string;
  private readonly accountId: string;
  private readonly baseUrl = "https://api.dropcowboy.com/v2";

  constructor(apiKey: string, accountId: string) {
    this.apiKey = apiKey;
    this.accountId = accountId;
  }

  private headers() {
    return {
      "X-API-Key": this.apiKey,
      "X-Account-Id": this.accountId,
      "Content-Type": "application/json",
    };
  }

  async createDrop(payload: DropCowboyDropPayload): Promise<DropCowboyDropResult> {
    const resp = await fetch(`${this.baseUrl}/drops`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        audio_url: payload.audioUrl,
        phone_numbers: payload.phoneNumbers,
        campaign_name: payload.campaignName,
        caller_id: payload.callbackNumber,
        scheduled_at: payload.scheduledAt,
        byoc: true,             // use Arrivia's Twilio trunk
      }),
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      throw new Error(`Drop Cowboy API error ${resp.status}: ${body}`);
    }

    const data = await resp.json();
    return {
      dropId: data.drop_id,
      status: data.status,
      rejectedNumbers: data.rejected_numbers,
      estimatedCostUsd: data.estimated_cost_usd,
    };
  }

  async getStatus(dropId: string): Promise<DropCowboyStatusResult> {
    const resp = await fetch(`${this.baseUrl}/drops/${dropId}`, {
      headers: this.headers(),
    });

    if (!resp.ok) {
      throw new Error(`Drop Cowboy status error ${resp.status}`);
    }

    const data = await resp.json();
    return {
      dropId: data.drop_id,
      status: data.status,
      deliveredAt: data.delivered_at,
      failureReason: data.failure_reason,
    };
  }

  async uploadAudio(mp3Buffer: Buffer, filename: string): Promise<string> {
    // Drop Cowboy accepts a URL, not a raw upload — host on Supabase Storage
    // and pass the public URL to createDrop. This method is a placeholder
    // for the Drop Cowboy hosted-audio flow if they add it.
    throw new Error("Use Supabase Storage to host audio, then pass the URL to createDrop");
  }
}

let _client: DropCowboyClient | null = null;

export function dropCowboyClient(): DropCowboyClient {
  if (_client) return _client;
  const e = env();
  if (!e.DROP_COWBOY_API_KEY) throw new Error("DROP_COWBOY_API_KEY is not set");
  _client = new DropCowboyClient(e.DROP_COWBOY_API_KEY, e.DROP_COWBOY_ACCOUNT_ID);
  return _client;
}
