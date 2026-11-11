# Agent Development Guide

This standalone demo helps users find and compare products through live, read-only Shopify Catalog queries.

## Shared scenario UI requirements

1. **Open the main page directly**: show the scenario explanation and task-specific start action inline. Do not add an introductory dialog, automatic welcome overlay, or Preview first step. Connecting, errors and retry feedback stay inline. Loading the page must not start a session or request microphone access.
2. **Keep the public scenario identity visible**: the public scenario name and short purpose remain visible on desktop and mobile from first load and throughout the session. The header and main heading use the same public name. Keep internal numeric IDs out of visible page and Build copy. Activity status must not replace the scenario name.
3. **Use our UIkit components**: adopt actual component source and accompanying theme/styles from [shczhen/agent-ui](https://github.com/shczhen/agent-ui), connected to real session data and actions. Preserve source provenance and RTC/RTM ownership.

Inspect desktop/mobile direct entry, reload and inline startup failure/retry states. Confirm there is no introductory overlay and that the main start control directly starts the existing session flow. Inspect actual screenshots before acceptance. Inspector, Build and the coach phrasebook open only on explicit user actions.

For transcript changes, verify desktop/mobile live text growth, hidden arrivals and showing the conversation again. Restore following only if it was active before hiding; preserve deliberate history reading and verify that Scroll to end resumes following.

This direct-entry rule applies to the base template and all scenarios. It supersedes earlier introductory-dialog requirements and per-scenario exceptions. Keep this self-contained section synchronized with the workspace SCENARIO_UI_RULES.md.

## Buyer-selected shopping markets

The shopping scenario uses the buyer-confirmed delivery country and currency, not a fixed U.S. market. Keep the voice interface and repository content in English. Examples may illustrate multiple markets and categories; never treat them as product restrictions. Ask for missing country or ambiguous currency before search, reuse them for product details, and replace them when corrected. Use ISO 4217 minor units and compare only matching-currency prices; never invent exchange rates or guarantee worldwide coverage. The reference clock does not establish buyer location. Keep synthetic examples distinguished from live facts, and retain source citations and third-party licenses.

## Repository language

Use English for repository content, including documentation, code comments, UI copy and examples. Keep future additions and edits free of Chinese text.

## Start here

Read [README.md](README.md) for setup and shopping, [ARCHITECTURE.md](ARCHITECTURE.md) for transport/tool ownership, and [RECIPE.md](RECIPE.md) for the public recipe.

Use Node.js 24 from .nvmrc and pnpm 9.15.9. Install with pnpm install --frozen-lockfile. Copy env.local.example to .env.local only when absent; never overwrite existing credentials. Run pnpm run doctor, pnpm run dev and pnpm run verify. Container checks use pnpm run verify:docker separately.

## Runtime ownership

- components/LandingPage.tsx owns token/invite bootstrap, RTM, renewal, stop and current-page state.
- components/ConversationComponent.tsx owns guarded RTC/toolkit initialization, transcripts and hook-owned media.
- lib/agent-config.ts, lib/scenario-knowledge.ts and lib/prompt-context.ts own voice guidance and reference date context; the reference clock does not select a shopping market.
- lib/agent-tools.ts exposes only SearchShopifyProducts and GetShopifyProduct.
- lib/shopify-config.ts and lib/shopify-catalog.ts own the fixed official endpoint, profile/token, diagnostic queries and normalization.
- components/ScenarioFaq.tsx owns the FAQ drawer and usage answers; styles/faq.css owns its scrolling and transitions. The header trigger shares the existing Dialog root with the drawer in LandingPage.
- app/api owns token/invite/stop and diagnostic read-only Catalog routes. The Agent constructor owns static waiting fillers.
- Inspector, Build, the adopted UIkit source and Docker remain supported.

## Preserve these contracts

- Voice startup requires only requester_id and channel_name. Do not create a shopping session, cart, local ledger or database.
- Preserve RtcTokenBuilder.buildTokenWithRtm, RTM identity/UID matching and RTM readiness before RTC/toolkit mount.
- Keep the isReady StrictMode guard and stable RTC client ref. useJoin owns leave, the microphone hook owns track cleanup, and usePublish owns publication. Never manually close a hook-owned track or disable React StrictMode.
- Remap the toolkit's local uid=0 sentinel and retain interrupted turns.
- Keep the public page focused on the shared voice workspace and usage FAQ. Do not add a manual product browser or direct callers to removed product/purchase controls.
- Keep FAQ in the upper-right header beside Inspector and Build. Open it only on request in a right-side drawer; do not restore a page-footer FAQ or a secondary link next to the voice start action. Preserve keyboard focus, Escape/backdrop dismissal and internal scrolling.
- Use the platform fillerWords configuration for waiting feedback: static phrases after a 1500 ms response wait. Keep failureMessage separate. Tool waits reuse the same configuration; do not add a second LLM request to generate fillers.
- Use synchronous HTTP tools for Shopify MCP: the native MCP validator rejects successful structuredContent-only replies that omit content. The adapter supplies UCP metadata; country and currency come from buyer-confirmed tool arguments. An empty price object represents an uncapped search. Preserve typed object substitution for price filters.
- Keep Shopify access read-only. Do not add cart changes, ordering, payment collection, stock reservation, shipping, refunds or persistent shopping history.
- Use fresh Catalog replies, no-store requests/responses and original merchant image URLs. Do not cache results, re-host images or copy live listings into fixtures.
- lib/shopify-market.ts owns diagnostic market validation and currency-specific budget conversion. Prices use currency minor units. Unknown price/stock remains unknown; inferred descriptions are not verified specifications. The merchant confirms final totals and delivery.
- NEXT_PUBLIC_AGORA_APP_ID is public and required at build/runtime. NEXT_AGORA_APP_CERTIFICATE and any optional SHOPIFY_CATALOG_ACCESS_TOKEN stay server-only. Local trials may use Shopify's hosted example UCP profile.
- Retain source attribution, licenses and font notices.

## Public presentation ownership

`lib/presentation.ts` owns the single public `name`, purpose and summary. The header and main heading both render that name; `app/layout.tsx` derives browser metadata from it. There is no separate headline field. Internal IDs stay available for diagnostics and configuration, without being rendered as public identity text.

## Verification and maintenance

Run pnpm run verify for repository checks, lint, types, mocked startup, Shopify HTTP/error cases, transcript/Inspector/prompt checks and build. Keep real Catalog traffic, screenshots, simulated media, human speech and Docker evidence distinct.

Inspect actual desktop/mobile screenshots after visible changes. Transcript changes also need live growth, hidden arrivals, paused history and Scroll to end checks.

Keep README.md, AGENTS.md, RECIPE.md and the conversation contract in ARCHITECTURE aligned with behavior. Contributor instructions are consolidated here; no layered AI document tree is required.

## Git Conventions

### Commit messages — conventional commits

- **Format:** `type: description` or `type(scope): description`
- **Types:** `feat:` (new feature), `fix:` (bug fix), `chore:` (maintenance, version bumps), `test:` (test additions/changes), `docs:` (documentation)
- **Scoped variant:** `feat(scope):`, `fix(scope):` — e.g. `feat(api): add stop-conversation status flag`
- **Lowercase after prefix** — `feat: add feature`, not `feat: Add feature`
- **Present tense** — "add feature", not "added feature"
- **PR number appended** — `feat: add feature (#123)`

### Branch names

- **Format:** `type/short-description` — lowercase, hyphen-separated
- **Types match commit types:** `feat/`, `fix/`, `chore/`, `test/`, `docs/`
- **Examples:** `feat/agent-metrics`, `fix/transcript-uid`, `docs/progressive-disclosure`

### General rules

- **No AI tool names** — never mention claude, cursor, copilot, cody, aider, gemini, codex, chatgpt, or gpt-3/4 in commit messages or PR descriptions.
- **No Co-Authored-By trailers** — omit AI attribution lines.
- **No `--no-verify`** — let git hooks run normally.
- **No git config changes** — do not modify `user.name` or `user.email`.

Local edits and verification do not authorize a commit. A commit does not authorize a push or GitHub write; each needs an explicit current-conversation request. Never change Git identity or bypass hooks.
