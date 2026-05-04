/**
 * Generate a printable OPC QR PNG.
 *
 * Default mode: encodes the /scan/<placement_id> attribution URL so every
 * scan is logged server-side before redirecting to tel:+14078538108.
 *
 * Direct mode (--direct): encodes tel:+14078538108 with no attribution.
 * Use only as a fallback if Supabase is offline at demo time.
 *
 * Usage:
 *   pnpm tsx scripts/setup/generate-opc-qr.ts \
 *     --placement=pool-deck-westgate-lakes \
 *     --label="Pool Deck — Westgate Lakes"
 *
 *   pnpm tsx scripts/setup/generate-opc-qr.ts --direct
 *
 * Output: public/opc-qr/<placement_id>.png  (700×700, ~50KB)
 */
import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import QRCode from "qrcode";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const [k, ...rest] = a.replace(/^--/, "").split("=");
      return [k!, rest.join("=") || "true"];
    }),
);

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\s+$/g, "") ??
  "https://arrivia-gvr.vercel.app";
const FALLBACK_PHONE = "+14078538108";

const placementId = String(args.placement ?? "pool-deck-westgate-lakes");
const label = String(args.label ?? "Westgate Lakes — Pool Deck");
const direct = args.direct === "true";

const target = direct
  ? `tel:${FALLBACK_PHONE}`
  : `${APP_URL}/scan/${placementId}`;

const outDir = join(process.cwd(), "public", "opc-qr");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `${placementId}.png`);

async function main() {
  await QRCode.toFile(outPath, target, {
    errorCorrectionLevel: "H", // tolerate 30% damage — printed cards get scuffed
    margin: 2,
    width: 700,
    color: { dark: "#000000", light: "#FFFFFF" },
  });
  console.log(`✓ QR PNG written → ${outPath}`);
  console.log(`  encodes: ${target}`);
  console.log(`  label:   ${label}`);
  console.log(`  mode:    ${direct ? "DIRECT (no attribution)" : "ATTRIBUTED (/scan/" + placementId + ")"}`);
  console.log("");
  console.log("Print at ~2 inches square minimum for reliable scanning.");
}
main().catch((e) => { console.error(e); process.exit(1); });
