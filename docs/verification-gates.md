# Verification Gates

Build is complete only when ALL of the following pass:

- [ ] `pnpm typecheck` passes with zero errors
- [ ] `pnpm lint` passes with zero errors
- [ ] `pnpm test` passes all unit + integration tests
- [ ] `pnpm eval:router` ≥ 95% on `tests/router/router-100.json`
- [ ] `pnpm eval:cards` ≥ 90% on `tests/router/answer-cards-50.json`
- [ ] `pnpm eval:rag` ≥ 90% top-3 on `tests/router/rag-50.json`
- [ ] `pnpm eval:validator` blocks 100% of `tests/adversarial/forbidden-numeric-claims.json`
- [ ] `pnpm eval:verifier` blocks 100% of `tests/adversarial/adversarial-50.json`
- [ ] Barge-in suite: agent stops speaking within 500ms of caller interrupt (manual via Retell sim or live)
- [ ] Silence suite: reminder fires at 8s, end-call at 30s
- [ ] 20 inbound Twilio calls connect, greet, respond without error
- [ ] `pnpm dial:latency` p95 < 800ms on answer-card route across 50 calls
- [ ] `pnpm dial:transfer` ≥ 98% bridged across 100 transfers
- [ ] Zero hallucinations reach TTS across 50-item adversarial suite
- [ ] Warm transfer: 30/30 staging transfers with whisper delivered + SMS screen-pop sent + Retell `transfer_call` succeeds
- [ ] Helicone traces flowing with CallId + Intent + EvidenceIds + AnswerCardId + AgentVersion tags
- [ ] Kill switch tested: `pnpm ops:kill` disables agent within 10s
- [ ] `pnpm ops:freeze` produces `gvr-demo-v1.0` git tag and `infra/retell/agent-v1.0.json` snapshot
- [ ] Backup laptop + hotspot runs full demo with live call
- [ ] Dashboard shows live transcript + validator/verifier verdict badges on the active call
