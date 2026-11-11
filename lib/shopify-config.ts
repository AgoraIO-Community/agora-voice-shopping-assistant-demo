export const SHOPIFY_CATALOG_ENDPOINT = 'https://catalog.shopify.com/api/ucp/mcp';
export const SHOPIFY_EXAMPLE_PROFILE = 'https://shopify.dev/ucp/agent-profiles/examples/2026-08-25/valid-with-capabilities.json';

export function getShopifyAgentProfile(): string {
  const url = new URL(process.env.SHOPIFY_UCP_AGENT_PROFILE_URL || SHOPIFY_EXAMPLE_PROFILE);
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('SHOPIFY_UCP_AGENT_PROFILE_URL must be a public HTTPS profile URL.');
  }
  return url.href;
}

export function getShopifyHeaders(): Record<string, string> {
  const token = process.env.SHOPIFY_CATALOG_ACCESS_TOKEN?.trim();
  return {
    'Content-Type': 'application/json', Accept: 'application/json, text/event-stream',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
