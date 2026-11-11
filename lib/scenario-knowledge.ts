// Source guidance only. Never bundle live product results or merchant images.
export const SCENARIO_KNOWLEDGE = {
  source: {
    kind: 'Live Shopify Global Catalog, queried through read-only MCP tools',
    documentation: 'https://shopify.dev/docs/agents/catalog/global-catalog',
    revision: '2026-11-10',
  },
  timeZone: 'America/New_York',
  market: 'Use the buyer-confirmed delivery country and currency. The reference clock is not the buyer location. The demo speaks English; this does not imply a U.S. market. Coverage depends on returned Catalog offers.',
  comparisonGuide: {
    requirements: 'Ask about intended use and the missing requirement that changes the recommendation. Do not limit searches to example categories. Do not infer compatibility, size, materials or performance from price or marketing labels.',
    prices: 'Use each returned currency and its ISO 4217 minor units. Only compare prices in the confirmed budget currency; never convert or relabel an offer. Tax, shipping and discounts remain unconfirmed.',
    availability: 'Use the returned variant availability. Unknown availability is not in stock; in stock does not guarantee delivery.',
    provenance: 'Catalog descriptions and technical attributes can be inferred. Do not present inferred attributes as independently verified manufacturer specifications.',
  },
} as const;
