# Retell Setup Checklist

Apply via `pnpm create:retell-agent && pnpm sync:retell-config`. Each ✓ is set by `infra/retell/agent.json` or `llm.json`.

## LLM (POST /create-retell-llm)
- [✓] `model: null` (custom LLM via WebSocket)
- [✓] `begin_message` (Module 0 opener with TCPA disclosure)
- [✓] `general_prompt` (system identity + non-endorsement guardrails + KB grounding rule)
- [✓] `general_tools`: `lookup_fact`, `create_transfer_context`, `transfer_call`, `log_demo_event`, `end_call`
- [✓] `knowledge_base_ids` (optional — disabled by default; we run custom RAG)
- [✓] `kb_config.top_k=3`, `filter_score=0.6`
- [✓] `llm_websocket_url` → Render ws-server subdomain

## Agent (POST /create-agent)
- [✓] `voice_id` → ElevenLabs clone (set `TBD_elevenlabs_clone` then update before Day 12)
- [✓] `voice_model: eleven_turbo_v2_5`
- [✓] `fallback_voice_ids: [cartesia-Cimo]`
- [✓] `responsiveness: 0.85`
- [✓] `interruption_sensitivity: 0.7`
- [✓] `enable_backchannel: true` · `backchannel_frequency: 0.6`
- [✓] `reminder_trigger_ms: 8000` · `reminder_max_count: 1`
- [✓] `language: en-US`
- [✓] `webhook_url: ${NEXT_PUBLIC_APP_URL}/api/retell/events`
- [✓] `webhook_events`: call_started, call_ended, call_analyzed, transfer_started/bridged/cancelled/ended/failed
- [✓] `webhook_timeout_ms: 10000`
- [✓] `boosted_keywords`: GVR, Arrivia, travel savings dollars, Government Vacation Rewards, loyalty
- [✓] `data_storage_setting: everything_except_pii` · `data_storage_retention_days: 90`
- [✓] `pronunciation_dictionary` for GVR + Arrivia
- [✓] `end_call_after_silence_ms: 30000`
- [✓] `max_call_duration_ms: 1800000`
- [✓] `stt_mode: accurate`
- [✓] `denoising_mode: noise-cancellation`
- [✓] `pii_config: { enabled: true }`
- [✓] `begin_message_delay_ms: 400`
- [✓] `ring_duration_ms: 20000`

## Twilio DID
- [✓] Buy DID
- [✓] Configure SIP trunk termination URI
- [✓] `pnpm import:twilio-number` to bind DID to agent
- [✓] Test 20 inbound calls

## Publish
- [✓] `pnpm ops:freeze` → tags `gvr-demo-v1.0`
