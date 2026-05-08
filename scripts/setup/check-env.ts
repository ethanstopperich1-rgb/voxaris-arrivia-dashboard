import "dotenv/config";
import { env } from "../../lib/config/env";

try {
  const e = env();
  const safe = {
    NODE_ENV: e.NODE_ENV,
    NEXT_PUBLIC_APP_URL: e.NEXT_PUBLIC_APP_URL,
    TWILIO_GVR_DEMO_DID: e.TWILIO_GVR_DEMO_DID,
    PRIMARY_SPECIALIST_NUMBER: e.PRIMARY_SPECIALIST_NUMBER,
    BACKUP_SPECIALIST_NUMBER: e.BACKUP_SPECIALIST_NUMBER,
    DEMO_MODE: e.DEMO_MODE,
    KILL_SWITCH: e.KILL_SWITCH,
  };
  console.log("env OK", JSON.stringify(safe, null, 2));
  process.exit(0);
} catch (e) {
  console.error(String(e));
  process.exit(1);
}
