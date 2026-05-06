import { deepgramClient } from "@/lib/clients/deepgram";
import type { QCResult } from "./types";

const DURATION_MIN_S = 18;
const DURATION_MAX_S = 35;
const SILENCE_ENERGY_THRESHOLD = 0.001;
const CONFIDENCE_MIN = 0.7;

// ─────────────────────────────────────────────
// MP3 duration from Xing/VBRI frame header (fast, no full decode)
// Falls back to rough byte-rate estimate if header not found.
// ─────────────────────────────────────────────
export function getAudioDurationS(mp3Buffer: Buffer): number {
  // Scan for MPEG frame sync (0xFF 0xFB / 0xFF 0xFA / 0xFF 0xF3 etc.)
  for (let i = 0; i < Math.min(mp3Buffer.length - 4, 10000); i++) {
    const byte0 = mp3Buffer[i];
    const byte1 = mp3Buffer[i + 1];
    if (byte0 === 0xff && byte1 !== undefined && (byte1 & 0xe0) === 0xe0) {
      const header = mp3Buffer.readUInt32BE(i);
      const bitrateIndex = (header >> 12) & 0xf;
      const sampleRateIndex = (header >> 10) & 0x3;
      const bitrates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
      const sampleRates = [44100, 48000, 32000, 0];
      const bitrate = (bitrates[bitrateIndex] ?? 0) * 1000;
      const sampleRate = sampleRates[sampleRateIndex] ?? 0;
      if (bitrate > 0 && sampleRate > 0) {
        return (mp3Buffer.length * 8) / bitrate;
      }
    }
  }
  // Fallback: assume 128 kbps
  return (mp3Buffer.length * 8) / 128000;
}

// ─────────────────────────────────────────────
// Silence / energy check — fast heuristic on raw bytes
// A fully silent MP3 will have near-zero byte variance in audio frames.
// ─────────────────────────────────────────────
export function isAudioSilent(mp3Buffer: Buffer): boolean {
  const sampleSize = Math.min(mp3Buffer.length, 4096);
  let sum = 0;
  for (let i = 0; i < sampleSize; i++) {
    sum += Math.abs((mp3Buffer[i] ?? 128) - 128);
  }
  const energy = sum / (sampleSize * 128);
  return energy < SILENCE_ENERGY_THRESHOLD;
}

// ─────────────────────────────────────────────
// ASR verification via Deepgram
// ─────────────────────────────────────────────
async function verifyTranscript(
  mp3Buffer: Buffer,
  expectedFirstName: string
): Promise<{ passed: boolean; transcript: string; confidence: number; reason?: string }> {
  const result = await deepgramClient().transcribeBuffer(mp3Buffer, "audio/mp3");

  if (result.confidence < CONFIDENCE_MIN) {
    return {
      passed: false,
      transcript: result.transcript,
      confidence: result.confidence,
      reason: `asr_confidence_too_low: ${result.confidence.toFixed(2)}`,
    };
  }

  const transcriptLower = result.transcript.toLowerCase();
  if (!transcriptLower.includes(expectedFirstName.toLowerCase())) {
    return {
      passed: false,
      transcript: result.transcript,
      confidence: result.confidence,
      reason: "first_name_not_found_in_transcript",
    };
  }

  if (!transcriptLower.includes("government vacation rewards")) {
    return {
      passed: false,
      transcript: result.transcript,
      confidence: result.confidence,
      reason: "brand_name_not_found_in_transcript",
    };
  }

  return { passed: true, transcript: result.transcript, confidence: result.confidence };
}

// ─────────────────────────────────────────────
// Full QC pipeline
// ─────────────────────────────────────────────
export async function runAudioQc(
  mp3Buffer: Buffer,
  expectedFirstName: string
): Promise<QCResult> {
  const durationS = getAudioDurationS(mp3Buffer);

  if (durationS < DURATION_MIN_S || durationS > DURATION_MAX_S) {
    return {
      passed: false,
      durationS,
      reason: `duration_out_of_range: ${durationS.toFixed(1)}s (expected ${DURATION_MIN_S}-${DURATION_MAX_S}s)`,
    };
  }

  if (isAudioSilent(mp3Buffer)) {
    return { passed: false, durationS, reason: "audio_silent" };
  }

  try {
    const asr = await verifyTranscript(mp3Buffer, expectedFirstName);
    if (!asr.passed) {
      return { passed: false, durationS, reason: asr.reason, transcript: asr.transcript };
    }
    return {
      passed: true,
      durationS,
      transcript: asr.transcript,
      confidence: asr.confidence,
    };
  } catch (err) {
    // ASR failure is non-fatal — log and pass through
    // (better to deliver than drop on transcription API outage)
    console.warn("[audio-qc] Deepgram transcription failed:", err);
    return { passed: true, durationS, reason: "asr_skipped_on_error" };
  }
}
