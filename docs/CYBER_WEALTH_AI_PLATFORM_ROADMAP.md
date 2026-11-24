# Cyber Wealth — AI Platform Strategy

## Mission
Build Cyber Wealth into an independent AI technology company with products, infrastructure, customers, and recurring revenue. Compete on useful workflows and measurable outcomes first; do not claim frontier-model capability until it exists and is benchmarked.

## Product strategy: earn the right to build a model
1. **AI Workbench (first product):** a customer-facing workspace for chat, document analysis, content generation, coding assistance, and reusable projects.
2. **Agent Studio:** controlled agents that execute approved multi-step workflows with tool permissions, budgets, audit logs, retries, and human approval for consequential actions.
3. **Business API:** stable API keys, usage metering, quotas, billing, customer workspaces, and developer documentation.
4. **Model Gateway:** provider-independent routing across hosted models, with cost/latency/quality telemetry, fallback policies, redaction, and per-customer limits.
5. **Cyber Wealth models:** only after data rights, compute budget, evaluation sets, safety testing, and a clear advantage justify fine-tuning or training. Start with evaluation and fine-tuning of open-weight models; do not promise a foundation model prematurely.

## Operating principles
- Never represent a third-party model as a Cyber Wealth-owned model.
- Every model response records provider/model/version, latency, token usage, cost estimate, and request ID.
- Customer data is private by default; no training on customer content without explicit opt-in.
- Secrets stay server-side; API keys are hashed or encrypted and never returned after creation.
- Rate limits, quotas, abuse controls, prompt-injection defenses, and audit trails are mandatory.
- Production actions with financial, legal, publishing, or data-deletion impact require explicit authorization.
- Never fabricate users, usage, revenue, model benchmarks, employees, or delivered work.

## Build sequence
### Phase 1 — Commercial foundation
- Complete service request → proposal → verified payment → production → QA → delivery.
- Ensure payment webhook idempotency and production status gates.
- Track real orders, cash transactions, refunds, costs, and customer outcomes separately from demo data.

### Phase 2 — AI Workbench MVP
- Authentication and isolated customer workspaces.
- Chat sessions and message history with retention controls.
- Server-side model gateway with provider adapters and safe fallback.
- Usage ledger and hard budget limits before calling paid model APIs.
- File upload and retrieval with per-workspace access checks.
- Clear disclosure of the model provider used.

### Phase 3 — Agent Studio
- Agent templates for marketing, design briefs, research, support, and software delivery.
- Tool allowlists, scoped credentials, approval checkpoints, execution traces, and kill switch.
- Background job queue, retry policy, timeout limits, and operator dashboard.

### Phase 4 — Business API and ecosystem
- API keys, scoped permissions, quotas, usage billing, webhooks, SDK examples, and versioned API.
- Team roles, audit logs, and enterprise controls.

### Phase 5 — Model ownership
- Build evaluation datasets from licensed/public or explicitly consented data.
- Benchmark candidate open-weight models on Indonesian and English tasks, latency, cost, safety, and tool use.
- Fine-tune only where evaluation proves a measurable benefit.
- Consider pretraining only with a defensible dataset, compute financing, research team, and safety program.

## Initial acceptance criteria
- No paid inference call occurs before quota and budget checks pass.
- Every request has a traceable provider, model, usage record, and cost estimate.
- Cross-customer data access tests pass.
- Invalid/missing provider credentials fail closed with a useful error.
- Provider outage is handled without silently misrepresenting output provenance.
- Admin dashboard distinguishes demo data from verified production data.
- CI passes and staging behavior is verified before any production release.

## Current known blockers
- The service payment gate is still on an open pull request and is not yet confirmed deployed at its latest commit.
- Payment processor credentials are not configured in staging, so live payment verification cannot be completed there.
- Email sending is not configured with a verified provider/domain.
- AI provider credentials currently fail or are unavailable; no Cyber Wealth-owned model exists yet.
- These blockers must be resolved with verified credentials, tests, and deployment evidence—not by hardcoded fake success states.
