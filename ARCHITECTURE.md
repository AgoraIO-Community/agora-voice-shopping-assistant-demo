# Voice Shopping Assistant Architecture

## Voice

The browser uses Agora RTC for audio and RTM for transcript and Agent events. The managed Agent connects directly to Shopify Global Catalog MCP with only search and product-detail HTTP adapters. Next.js signs Agora credentials and starts/stops the Agent. No public callback tunnel, database, result store or application-managed cart is needed.

The original token, invite, RTM setup, guarded RTC mount, renewal and stop paths retain their ownership. Agent startup requires requester_id and channel_name only. lib/agent-tools.ts configures the HTTP-to-MCP endpoint and only SearchShopifyProducts and GetShopifyProduct; the optional bearer token never reaches the browser.

## Scenario page

The page keeps the shared ScenarioIdentity, QuickstartPreCallCard, ConversationWorkspace, voice controls, transcript, Inspector and Build guide. The header's FAQ trigger and components/ScenarioFaq.tsx share an existing Radix Dialog root in LandingPage. FAQ opens a right-side drawer using the same edge-panel layout as Inspector, with native disclosure items in a scrollable body. Dialog handles focus trapping, Escape, backdrop dismissal and returning focus to the trigger. It is closed by default; there is no FAQ section below the workspace or link beside the start action. Reading or expanding the FAQ starts neither a microphone session nor a Catalog request.

There is no page-owned product browser or product-selection handoff. Voice instructions identify products and merchants by name and do not direct the caller to nonexistent page controls. Purchases happen independently on merchant websites.

## Waiting feedback

The Agent constructor configures fillerWords with enable=true, a fixed_time trigger of 1500 ms and three static phrases selected with shuffle. The SDK serializes this as properties.filler_words. Tool waits reuse the same filler configuration; there is no separate tool-only trigger or extra filler LLM request. failureMessage is a failure fallback, not a waiting trigger. Audible timing and interruption need real voice acceptance.

## Read-only diagnostics

GET /api/catalog/search and GET /api/catalog/product remain available for diagnostics and HTTP regression checks. The public page does not call these routes. lib/shopify-catalog.ts validates inputs, injects the UCP profile and buyer-selected market context, applies a 12-second deadline and normalizes fresh product data. Both routes and upstream fetches use no-store.

## Session time limit

LandingPage enforces a ten-minute browser session deadline from successful startup. It reuses the manual stop flow, checks wall time every second and on focus/visibility changes, and retries failed stops every five seconds. Successful stop retains the transcript and shows a timeout notice; starting again resets the deadline. Effect cleanup removes the timer/listeners. This is not a server-side usage cap: closed pages, suspended devices and network failures can delay Agent shutdown.

The conversation header shows a small, muted countdown (10:00 left) immediately before the connection status. The last minute is highlighted, with an automatic-stop notice for screen readers. At the deadline the timer stays at 00:00 until stopping succeeds. Screen readers do not announce every tick.

## State and failures

Only current-page rendering and conversation state are retained. There is no catalog cache, database or persistent business session. Invalid Catalog input returns 400; 429 preserves Retry-After; upstream/malformed responses return 502 and deadline expiry returns 504. Errors never fall back to fictional products.

## Verification

pnpm run verify includes actual HTTP client requests to a synthetic local upstream and mocked Agent startup with a read-only HTTP allowlist. Real Catalog traffic, rendered UI, Docker and real voice acceptance are distinct evidence scopes.

## MCP reply compatibility

Shopify can return a JSON-RPC result containing structuredContent without a content array. A real test Agent reached Shopify and received HTTP 200, but Agora's native MCP client's CallToolResult validator rejected that reply with content: Field required. The two explicit synchronous HTTP tools send JSON-RPC directly to the same official Shopify MCP endpoint and return the original JSON to the model, avoiding that incompatible validator. The profile is fixed in the adapter. Both tools require buyer-confirmed country and currency; search also accepts query and a price object whose optional max is in that currency’s minor units. The HTTP body substitutes the full price object, including an empty object for an uncapped search. No proxy host or callback tunnel is added.

## Conversation behavior

### What the assistant helps with

Clarify what the caller wants and confirm their delivery country and currency. Search across requested product categories with an optional budget, and inspect the strongest candidate using the same market before recommending it. Explain one concrete reason and at most one alternative. Preserve corrections without repeating intake.

Use fresh tool facts, check the selected variant's price and availability, and read the returned currency’s minor units correctly; never compare or relabel mixed-currency offers. Unknown price or availability stays unknown. Catalog-inferred descriptions are discovery guidance; exact compatibility must be checked with the merchant.

### Page and voice workflow

The page uses the shared scenario identity, voice start action, conversation workspace, transcript, Inspector and Build guide. FAQ in the upper-right header opens a right-side drawer explaining microphone permission, example requests, buyer-selected markets and currencies, lookup waits and merchant-only purchasing. It stays closed until requested and has a scrollable body on narrow or short screens. There is no manual product browser or FAQ section below the workspace. The caller describes requirements by voice; the Agent searches and checks product details before giving a concise recommendation and merchant name.

The Agent enables static filler words after a 1500 ms response wait, including tool waits. This acknowledgement does not shorten the underlying lookup. Verify audible playback and interruption separately from configuration tests.

### Capability boundary

This version supports live, read-only Shopify product discovery. Compare returned products against a budget in the buyer-confirmed currency and send buyers to merchant websites. No cart changes, order placement, payment collection, stock reservation, saved shopping history or cross-session business records are available. Keep credentials server-only and never claim a purchase, payment or shipment was completed.

An upstream merchant checkout URL does not establish that this application created an order or collected payment. Spoken answers identify the product and merchant without claiming that purchase controls are displayed. Dates in the prompt calendar do not establish stock or delivery promises.

### Integration contract

The HTTP-to-MCP endpoint is https://catalog.shopify.com/api/ucp/mcp. Only SearchShopifyProducts and GetShopifyProduct are exposed. The adapter supplies meta.ucp-agent.profile, catalog arguments and buyer-confirmed country/currency context for each upstream call. Local trials use Shopify's hosted example profile; optional credentials stay server-only.

The retained diagnostic GET /api/catalog/search and GET /api/catalog/product routes use no-store and are not part of the public page workflow. No database or public local-server callback is required.

## Market and currency contract (verified 2026-11-10)

The [Shopify Global Catalog documentation](https://shopify.dev/docs/agents/catalog/global-catalog) and the live `tools/list` schema expose free-text product search, `context.address_country` (ISO 3166-1 alpha-2), `context.currency` (ISO 4217), `filters.ships_to.country`, and optional integer minor-unit price limits. They do not restrict queries to microphones/cameras or fix U.S./USD. No exhaustive market/currency availability matrix was established by these sources.

Direct anonymous live searches succeeded for GB/GBP running shoes, CA/CAD coffee beans and JP/JPY backpacks. GB results used GBP; CA and JP results included USD alongside the requested currency. These observations establish successful requests for those cases only. A requested currency is a localization signal, not guaranteed conversion, and market/category coverage depends on merchant offers. Never compare differently denominated amounts, convert currencies without a conversion service, or silently substitute a different market.

`SearchShopifyProducts` requires `query`, `country`, `currency`, and `price`. Set `price.max` in the currency's minor units, or pass `{}` with no cap. `GetShopifyProduct` requires `id`, `country`, and `currency`. The adapter fixes neither market nor budget. The [Agora HTTP tool contract](https://docs.agora.io/en/api-reference/api-ref/conversational-ai/join) supports complete body placeholders that preserve JSON type, allowing the entire price object to be substituted without unresolved optional placeholders.

Diagnostic API examples:

- `/api/catalog/search?q=running%20shoes&country=GB&currency=GBP&budget=150`
- `/api/catalog/search?q=coffee%20beans&country=CA&currency=CAD` (no cap)
- `/api/catalog/product?id=RETURNED_ID&country=GB&currency=GBP`

Country and currency are required on both diagnostic routes. Country format and runtime-recognized ISO currency are checked before provider traffic; these checks do not certify provider coverage. The optional diagnostic budget is in major units. `lib/shopify-market.ts` uses Intl currency digits to convert budgets, rejects excess precision and unsafe integer amounts, and supplies aligned unit guidance to the Agent. Returned amounts remain integers with their original currency codes. Normalization selects available matching-currency offers, excludes mismatched prices from comparisons, and preserves unknown price/availability. Search `warnings` reports other returned currencies; an empty normalized result is not proof that no inventory exists. Raw voice-tool results are interpreted under the Agent's currency-checking instructions; they do not pass through diagnostic normalization.

The conversation must ask for missing delivery country or ambiguous currency before searching and retain corrections within the current call. The reference date clock and English voice settings do not select a buyer location. Automated request/prompt checks establish configuration and HTTP behavior; hosted tool execution and real speech need separate acceptance.

## Token lifetime compatibility

Browser RTC/RTM tokens and server-side Agent/REST tokens use the shared ten-minute `TOKEN_LIFETIME_SECONDS` duration. Token builders take durations, not Unix expiry timestamps. Keep the App Certificate and ConvoAI-capable REST tokens on the server.

The Agent start/stop routes explicitly mint tokens with `ConvoAITokenBuilder.buildToken` and pass the supported SDK `authToken` / session `token` options. This avoids the `agora-agents` 2.14.0 / `agora-token` 2.0.7 positional-argument mismatch: the SDK helper otherwise treats publisher role `1` as a one-second token lifetime. Do not patch installed dependencies or add blanket overrides. `verify:api` exercises the real SDK serialization with intercepted network transport, decodes and verifies actual signed tokens, and checks a 600-second lifetime for browser, REST start, Agent RTC/RTM and REST stop tokens. Revisit the explicit-token compatibility path only after an upstream SDK correction passes this regression and live acceptance.
