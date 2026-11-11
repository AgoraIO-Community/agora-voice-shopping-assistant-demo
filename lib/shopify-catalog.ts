import type { CatalogMarket, CatalogMoney, CatalogProduct, CatalogSearchResult, CatalogVariant } from '@/types/shopify';
import { getShopifyAgentProfile, getShopifyHeaders, SHOPIFY_CATALOG_ENDPOINT } from './shopify-config';
import { budgetInMinorUnits, CatalogError, validateMarket } from './shopify-market';
export { CatalogError } from './shopify-market';

type JsonObject = Record<string, unknown>;
const object = (value: unknown): JsonObject => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const text = (value: unknown): string => typeof value === 'string' ? value : '';

function safeUrl(value: unknown): string | null {
  try {
    const url = new URL(text(value));
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

function money(value: unknown): CatalogMoney | null {
  const item = object(value);
  return Number.isSafeInteger(item.amount) && Number(item.amount) >= 0 && /^[A-Z]{3}$/.test(text(item.currency))
    ? { amount: Number(item.amount), currency: text(item.currency) } : null;
}

function plainDescription(value: unknown): string {
  const item = object(value);
  return (text(item.plain) || text(item.html))
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim().slice(0, 1800);
}

function variant(value: unknown, title: string): CatalogVariant {
  const item = object(value);
  const available = object(item.availability).available;
  return {
    id: text(item.id), title: text(item.title) || title, price: money(item.price),
    merchant: text(object(item.seller).name) || 'Merchant not provided',
    description: plainDescription(item.description),
    imageUrl: safeUrl(list(item.media).map(object).find(value => value.type === 'image' && safeUrl(value.url))?.url),
    available: typeof available === 'boolean' ? available : null,
    productUrl: safeUrl(item.url), checkoutUrl: safeUrl(item.checkout_url),
    options: list(item.options).map(object).map(option => ({ name: text(option.name), label: text(option.label) })).filter(option => option.name && option.label),
  };
}

function product(value: unknown, currency: string, maxPriceMinor?: number): CatalogProduct | null {
  const item = object(value);
  if (!text(item.id) || !text(item.title)) return null;
  const rawVariants = list(item.variants).map(object);
  const variants = rawVariants.map(value => variant(value, text(item.title)));
  const candidates = variants.filter(value => value.available !== false && value.price?.currency === currency &&
    (maxPriceMinor === undefined || value.price.amount <= maxPriceMinor));
  const selected = candidates.sort((a, b) => a.price!.amount - b.price!.amount)[0]
    ?? variants.find(value => value.available !== false && !value.price);
  const selectedRaw = rawVariants.find(value => value.id === selected?.id) ?? {};
  const price = selected ? selected.price : variants.length ? null : money(object(item.price_range).min);
  if (variants.length && !selected) return null;
  if (price && (price.currency !== currency || (maxPriceMinor !== undefined && price.amount > maxPriceMinor))) return null;
  const image = [...list(selectedRaw.media), ...list(item.media)].map(object).find(value => value.type === 'image' && safeUrl(value.url));
  return {
    id: text(item.id), title: text(item.title),
    description: plainDescription(selectedRaw.description) || plainDescription(item.description),
    merchant: text(object(selectedRaw.seller).name) || 'Merchant not provided', imageUrl: safeUrl(image?.url), price,
    available: selected?.available ?? null, productUrl: selected?.productUrl ?? safeUrl(item.url),
    checkoutUrl: selected?.checkoutUrl ?? null, variants,
  };
}

async function callCatalog(name: 'search_catalog' | 'get_product', catalog: JsonObject): Promise<JsonObject> {
  let response: Response;
  try {
    response = await fetch(SHOPIFY_CATALOG_ENDPOINT, {
      method: 'POST', headers: getShopifyHeaders(), cache: 'no-store', signal: AbortSignal.timeout(12_000),
      body: JSON.stringify({ jsonrpc: '2.0', id: crypto.randomUUID(), method: 'tools/call',
        params: { name, arguments: { meta: { 'ucp-agent': { profile: getShopifyAgentProfile() } }, catalog } } }),
    });
  } catch (error) {
    const timedOut = error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name);
    throw new CatalogError(timedOut ? 504 : 502, timedOut ? 'The product search took too long. Please try again.' : 'Could not reach Shopify. Please try again.');
  }
  if (response.status === 429) {
    const seconds = Number(response.headers.get('retry-after'));
    const retryAfter = Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : 30;
    throw new CatalogError(429, `Shopify is receiving too many requests. Try again in ${retryAfter} seconds.`, retryAfter);
  }
  if (!response.ok) throw new CatalogError(502, 'Shopify could not complete this lookup. Please try again.');
  let payload: JsonObject;
  try {
    const body = await response.text();
    if (body.length > 1_048_576) throw new Error('Catalog response too large');
    const data = response.headers.get('content-type')?.includes('text/event-stream')
      ? body.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).filter(value => value && value !== '[DONE]').at(-1) : body;
    payload = object(JSON.parse(data || ''));
  } catch (error) {
    if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)) {
      throw new CatalogError(504, 'The product lookup took too long. Please try again.');
    }
    throw new CatalogError(502, 'Shopify returned an unreadable response. Please try again.');
  }
  const result = object(payload.result);
  if (payload.error || result.isError) throw new CatalogError(502, 'Shopify could not complete this lookup. Please try again.');
  if (result.structuredContent) return object(result.structuredContent);
  try {
    const content = list(result.content).map(object).find(item => item.type === 'text');
    return object(JSON.parse(text(content?.text)));
  } catch { throw new CatalogError(502, 'Shopify returned an unreadable response. Please try again.'); }
}

export async function searchShopifyCatalog(query: string, market: CatalogMarket, budget?: number): Promise<CatalogSearchResult> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length > 180) throw new CatalogError(400, 'Enter a product search between 1 and 180 characters.');
  validateMarket(market.country, market.currency);
  const maxPriceMinor = budgetInMinorUnits(budget, market.currency);
  const data = await callCatalog('search_catalog', {
    query: trimmed, context: { address_country: market.country, currency: market.currency, language: 'en-US' }, pagination: { limit: 4 },
    filters: { available: true, ships_to: { country: market.country }, ...(maxPriceMinor === undefined ? {} : { price: { max: maxPriceMinor } }) },
  });
  if (!Array.isArray(data.products)) throw new CatalogError(502, 'Shopify returned an incomplete search response. Please try again.');
  if (data.products.length && data.products.every(value => !text(object(value).id) || !text(object(value).title))) {
    throw new CatalogError(502, 'Shopify returned incomplete product information. Please try again.');
  }
  const hasOtherCurrencies = data.products.some(value => {
    const item = object(value);
    return [money(object(item.price_range).min), ...list(item.variants).map(value => money(object(value).price))]
      .some(price => price && price.currency !== market.currency);
  });
  return { products: data.products.map(value => product(value, market.currency, maxPriceMinor)).filter((value): value is CatalogProduct => value !== null),
    query: trimmed, checkedAt: new Date().toISOString(), market,
    warnings: hasOtherCurrencies ? ['Shopify returned offers in other currencies. They were excluded from price comparisons; no currency conversion was performed.'] : [] };
}

export async function getShopifyProduct(id: string, market: CatalogMarket): Promise<CatalogProduct> {
  if (!/^gid:\/\/shopify\/(?:p|Product|ProductVariant)\/[A-Za-z0-9_-]+$/.test(id)) throw new CatalogError(400, 'Choose a product from the search results.');
  validateMarket(market.country, market.currency);
  const data = await callCatalog('get_product', { id, context: { address_country: market.country, currency: market.currency, language: 'en-US' } });
  const result = product(data.product, market.currency);
  if (!result) throw new CatalogError(502, 'Shopify did not return an available offer for this product in the requested currency. Search again or confirm another currency.');
  return result;
}
