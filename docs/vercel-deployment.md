# Vercel Deployment

## Project setup
1. `vercel link` (or import via the dashboard).
2. Set framework preset: **Next.js**.
3. Node runtime: **20.x** or higher.

## Environment variables
Push every var from `.env.example` into Vercel:

```bash
vercel env pull .env.local            # if you've already added them via the dashboard
# or, for each var:
vercel env add RETELL_API_KEY production
```

Critical: do NOT put the WebSocket handler on Vercel. Vercel Functions can't host long-lived WS. The `app/api/retell/custom-llm-ws/route.ts` file returns 426 by design. Deploy `/ws-server/index.ts` to Render or Fly:

```bash
# Example Render service:
# Build command: pnpm install && pnpm build
# Start command: pnpm ws
# Environment: copy SUPABASE_*, UPSTASH_*, ANTHROPIC_API_KEY, OPENAI_API_KEY, COHERE_API_KEY, HELICONE_API_KEY
```

Then set `RETELL_LLM_WEBSOCKET_URL=wss://gvr-voice-ws.onrender.com/retell/custom-llm-ws` and run `pnpm sync:retell-config`.

## Cron
`vercel.json` declares two cron paths:
- `/api/cron/prewarm` — every 5 minutes, keeps LLM connections hot.
- `/api/cron/cleanup` — daily, drops `latency_events > 30 days`.

## Domains
Bind `gvr-voice.voxaris.ai` (or chosen subdomain) to the project. Update `NEXT_PUBLIC_APP_URL` accordingly and re-run `pnpm sync:retell-config`.
