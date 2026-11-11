# Agora Voice Shopping Assistant Demo

## 1. Overview

Find and compare products through Shopify Global Catalog and discuss the trade-offs by voice. This version supports live, read-only Shopify product discovery. Compare returned products against a budget in the buyer-confirmed currency and send buyers to merchant websites. No cart changes, order placement, payment collection, stock reservation, saved shopping history or cross-session business records are available. Keep credentials server-only and never claim a purchase, payment or shipment was completed.

## 2. Try the Demo

Follow [local setup](README.md#run-it). Choose Start voice shopping and describe your needs, such as trail running shoes delivered to the UK under GBP 150. Ask for one comparison, correct a requirement and request the product and merchant names. FAQ in the upper-right header opens the usage drawer beside Inspector and Build.

## 3. Architecture & Tech Stack

The browser uses Agora RTC for audio and RTM for transcript and Agent events. The managed Agent connects directly to Shopify Global Catalog MCP with only search and product-detail HTTP adapters. Next.js signs Agora credentials and starts/stops the Agent. No public callback tunnel, database, result store or application-managed cart is needed.

The existing Next.js 16, React 19, TypeScript, agora-agents, Agora RTC/RTM and adopted agent-ui components remain in use.

## 4. Prerequisites & Configuration

Use Node.js 24 and pnpm 9.15.9. Preserve .env.local and configure NEXT_PUBLIC_AGORA_APP_ID and server-only NEXT_AGORA_APP_CERTIFICATE. Anonymous Shopify local trials need no key; optional SHOPIFY_CATALOG_ACCESS_TOKEN and SHOPIFY_UCP_AGENT_PROFILE_URL are documented in env.local.example. Production needs an owned UCP profile and appropriate Catalog credentials.

## 5. Quick Start

~~~bash
pnpm install --frozen-lockfile
pnpm run doctor
pnpm run dev
~~~

Open http://localhost:3000. Open FAQ from the header or choose Start voice shopping. The page requests microphone access only after the voice start action.

## 6. How It Works

The Agent connects to Shopify's official Global Catalog MCP with a read-only allowlist. It searches current offers and checks a candidate before recommending it. Built-in static filler words acknowledge response waits after 1500 ms, including tool waits, without an additional LLM request. The page shows the shared voice workspace; FAQ opens on demand in a right-side drawer. Legacy simulated cart/order APIs remain disabled.

## 7. Customize for Your Business

Edit lib/agent-config.ts for conversation flow, lib/agent-tools.ts for the HTTP-to-MCP allowlist, lib/shopify-config.ts for the profile/token and components/ScenarioFaq.tsx for usage answers. Keep product data fresh, buyer-confirmed delivery country and currency consistent across tools, currency minor units correct, and purchase completion on merchant websites. A budget is optional. Compare only offers in the confirmed currency; do not invent conversion rates or guarantee market coverage.

## 8. Deployment & Validation

Follow [deployment instructions](README.md#deployment). Run pnpm run verify; run pnpm run verify:docker separately. Mocked Agora checks and synthetic Shopify HTTP tests do not prove actual speech or hosting. Validate real Catalog requests, desktop/mobile UI, real tool-backed conversations, interruption and clean stop separately.
