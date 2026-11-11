import type { LlmTool } from 'agora-agents';
import { getShopifyAgentProfile, getShopifyHeaders, SHOPIFY_CATALOG_ENDPOINT } from './shopify-config';
import { marketProperties } from './shopify-market';

// Shopify returns structuredContent without content; synchronous HTTP tools preserve that JSON.
// The native MCP client's CallToolResult validator currently rejects this otherwise successful reply.
export function getScenarioTools(): LlmTool[] {
  const meta = { 'ucp-agent': { profile: getShopifyAgentProfile() } };
  const context = { address_country: '{{args.country}}', currency: '{{args.currency}}', language: 'en-US' };
  const server = { method: 'POST' as const, url: SHOPIFY_CATALOG_ENDPOINT,
    headers: { ...getShopifyHeaders(), Accept: 'application/json' }, timeout_ms: 12_000 };
  return [
    {
      type: 'function',
      function: {
        name: 'SearchShopifyProducts',
        description: 'Search products across Shopify merchants for the buyer-confirmed delivery country and currency. Returns JSON-RPC result.structuredContent.products. Check each returned price currency before comparing: localization can return other currencies. Prices are integer ISO 4217 minor units, not always cents. Read-only; does not create a cart or purchase.',
        parameters: {
          type: 'object', additionalProperties: false,
          properties: {
            query: { type: 'string', minLength: 1, maxLength: 180, description: 'Specific product/use-case search, such as trail running shoes or organic coffee beans. No fixed product-category restriction.' },
            ...marketProperties,
            price: { type: 'object', additionalProperties: false,
              description: 'Set max to the confirmed budget in the chosen currency minor units. Use an empty object when there is no budget cap; never invent a cap. GBP 150 = 15000, JPY 15000 = 15000, KWD 15 = 15000.',
              properties: { max: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER } } },
          },
          required: ['query', 'country', 'currency', 'price'],
        },
      },
      server: { ...server, body: { jsonrpc: '2.0', id: '{{tool_call_id}}', method: 'tools/call',
        params: { name: 'search_catalog', arguments: { meta, catalog: {
          query: '{{args.query}}', context, pagination: { limit: 4 },
          filters: { available: true, ships_to: { country: '{{args.country}}' }, price: '{{args.price}}' },
        } } } } },
    },
    {
      type: 'function',
      function: {
        name: 'GetShopifyProduct',
        description: 'Retrieve fresh details for a returned Shopify product or variant ID using the same buyer-confirmed country and currency as search. Returns JSON-RPC result.structuredContent.product with integer minor-unit prices, currency codes, availability and merchant. Returned currencies may differ from the requested currency; never relabel or convert them. Read-only.',
        parameters: {
          type: 'object', additionalProperties: false,
          properties: { id: { type: 'string', pattern: '^gid://shopify/(p|Product|ProductVariant)/[A-Za-z0-9_-]+$', description: 'Use an exact product or variant ID from search results or the caller-selected product.' }, ...marketProperties },
          required: ['id', 'country', 'currency'],
        },
      },
      server: { ...server, body: { jsonrpc: '2.0', id: '{{tool_call_id}}', method: 'tools/call',
        params: { name: 'get_product', arguments: { meta, catalog: { id: '{{args.id}}', context } } } } },
    },
  ];
}
