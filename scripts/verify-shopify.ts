import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { NextRequest } from 'next/server';
import { GET as search } from '../app/api/catalog/search/route';
import { GET as getProduct } from '../app/api/catalog/product/route';
import { getScenarioTools } from '../lib/agent-tools';
import { budgetInMinorUnits } from '../lib/shopify-market';
import { SHOPIFY_CATALOG_ENDPOINT, SHOPIFY_EXAMPLE_PROFILE } from '../lib/shopify-config';

// Synthetic fixtures only: never copy live Shopify results or merchant images into tests.
const fixture = {
  id: 'gid://shopify/p/test-mic', title: 'Example USB Microphone',
  description: { plain: 'Example catalog description.' },
  variants: [
    { id: 'gid://shopify/ProductVariant/1', title: 'Premium kit', price: { amount: 25000, currency: 'USD' }, availability: { available: true }, url: 'https://example.com/premium' },
    { id: 'gid://shopify/ProductVariant/2', title: 'Desk kit', price: { amount: 5699, currency: 'USD' }, availability: { available: true },
      description: { plain: '<p>Example <b>merchant</b> details.</p>' },
      url: 'https://example.com/microphone', checkout_url: 'https://example.com/cart/test:1',
      media: [{ type: 'image', url: 'https://example.com/microphone.png' }], seller: { name: 'Example Audio Store' },
      options: [{ name: 'Color', label: 'Black' }] },
  ],
};
const unknownFixture = {
  id: 'gid://shopify/p/test-unknown', title: 'Example with unknown offer',
  price_range: { min: { amount: 1000, currency: 'USD' } },
  variants: [{ id: 'gid://shopify/ProductVariant/3', url: 'javascript:alert(1)', checkout_url: 'http://example.com/checkout' }],
};

async function main() {
  let mode = 'success';
  let expectedMarket = { country: 'US', currency: 'USD' };
  let searchFixtures = [fixture, unknownFixture];
  let detailFixture = fixture;
  let calls = 0;
  let observed: Record<string, unknown> | undefined;
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.SHOPIFY_CATALOG_ACCESS_TOKEN;
  const originalProfile = process.env.SHOPIFY_UCP_AGENT_PROFILE_URL;
  delete process.env.SHOPIFY_CATALOG_ACCESS_TOKEN;
  delete process.env.SHOPIFY_UCP_AGENT_PROFILE_URL;

  const server = createServer(async (req, res) => {
    calls += 1;
    assert.equal(req.method, 'POST');
    assert.equal(req.url, '/api/ucp/mcp');
    let body = '';
    for await (const chunk of req) body += chunk;
    const request = JSON.parse(body);
    observed = request;
    assert.equal(request.method, 'tools/call');
    assert.equal(request.params.arguments.meta['ucp-agent'].profile, SHOPIFY_EXAMPLE_PROFILE);
    assert.equal(request.params.arguments.catalog.context.address_country, expectedMarket.country);
    assert.equal(request.params.arguments.catalog.context.currency, expectedMarket.currency);
    if (mode === 'token') assert.equal(req.headers.authorization, 'Bearer fixture-token');
    else assert.equal(req.headers.authorization, undefined);
    if (mode === 'rate-limit') { res.writeHead(429, { 'Retry-After': '7' }); res.end('busy'); return; }
    if (mode === 'server-error') { res.writeHead(503); res.end('<html>Unavailable</html>'); return; }
    if (mode === 'malformed') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{invalid'); return; }
    if (mode === 'timeout') {
      const timer = setTimeout(() => res.end('{}'), 15_000);
      res.on('close', () => clearTimeout(timer));
      return;
    }
    const content = request.params.name === 'get_product' ? { product: detailFixture }
      : mode === 'missing-products' ? {} : { products: mode === 'empty' ? [] : searchFixtures };
    const result = mode === 'text-content' ? { content: [{ type: 'text', text: JSON.stringify(content) }] }
      : mode === 'tool-error' ? { isError: true, content: [{ type: 'text', text: 'Synthetic tool failure' }] }
      : { structuredContent: content };
    const reply = JSON.stringify({ jsonrpc: '2.0', id: request.id, result });
    res.writeHead(200, { 'Content-Type': mode === 'sse' ? 'text/event-stream' : 'application/json' });
    res.end(mode === 'sse' ? `event: message\ndata: ${reply}\n\n` : reply);
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  globalThis.fetch = ((input, init) => {
    assert.equal(String(input), SHOPIFY_CATALOG_ENDPOINT, 'Application must keep the fixed official origin.');
    assert.equal(init?.cache, 'no-store');
    return originalFetch(origin + '/api/ucp/mcp', init);
  }) as typeof fetch;
  const request = (query = 'q=USB+microphone&budget=150') => new NextRequest('http://localhost/api/catalog/search?' + query + '&country=' + expectedMarket.country + '&currency=' + expectedMarket.currency);
  try {
    let response: Response = await search(request());
    assert.equal(response.status, 200);
    assert.match(response.headers.get('cache-control')!, /no-store/);
    const result = await response.json();
    assert.equal(result.products.length, 2);
    assert.deepEqual(result.products[0].price, { amount: 5699, currency: 'USD' });
    assert.equal(result.products[0].productUrl, 'https://example.com/microphone');
    assert.equal(result.products[0].merchant, 'Example Audio Store');
    assert.equal(result.products[0].description, 'Example merchant details.');
    assert.equal(result.products[1].price, null);
    assert.equal(result.products[1].available, null);
    assert.equal(result.products[1].productUrl, null);
    assert.equal(result.products[1].checkoutUrl, null);
    const catalog = (observed as { params: { arguments: { catalog: Record<string, unknown> } } }).params.arguments.catalog;
    assert.deepEqual(catalog.filters, { available: true, ships_to: { country: 'US' }, price: { max: 15000 } });
    assert.deepEqual(catalog.pagination, { limit: 4 });

    const beforeInvalid = calls;
    for (const query of ['', 'q=x&budget=0', 'q=x&budget=NaN', 'q=x&budget=-1', 'q=x&budget=1.001', 'q=x&budget=1e20']) assert.equal((await search(request(query))).status, 400);
    assert.equal((await getProduct(new NextRequest('http://localhost/api/catalog/product?id=https://example.com'))).status, 400);
    assert.equal(calls, beforeInvalid, 'Invalid inputs must not contact the provider.');

    response = await search(request('q=USB+microphone&budget=40'));
    assert.deepEqual((await response.json()).products.map((p: { id: string }) => p.id), ['gid://shopify/p/test-unknown']);

    // Invalid or missing market must never fall back to U.S./USD.
    const beforeMarketInvalid = calls;
    for (const query of ['q=coffee', 'q=coffee&country=CA', 'q=coffee&currency=CAD', 'q=coffee&country=USA&currency=USD', 'q=coffee&country=GB&currency=ZZZ']) {
      assert.equal((await search(new NextRequest('http://localhost/api/catalog/search?' + query))).status, 400);
    }
    assert.equal((await getProduct(new NextRequest('http://localhost/api/catalog/product?id=' + encodeURIComponent(fixture.id)))).status, 400);
    assert.equal(calls, beforeMarketInvalid);

    for (const [country, currency, budget, max] of [
      ['GB', 'GBP', 150, 15000], ['CA', 'CAD', 150, 15000],
      ['JP', 'JPY', 15000, 15000], ['KW', 'KWD', 15.125, 15125],
    ] as const) {
      expectedMarket = { country, currency };
      const localFixture = structuredClone(fixture);
      localFixture.title = 'Synthetic running shoes';
      localFixture.variants.forEach(variant => { variant.price.currency = currency; });
      const mismatchedVariant = structuredClone(localFixture.variants[0]);
      mismatchedVariant.id = 'gid://shopify/ProductVariant/wrong-currency';
      mismatchedVariant.price = { amount: 1, currency: 'USD' };
      localFixture.variants.unshift(mismatchedVariant);
      detailFixture = localFixture;
      searchFixtures = [localFixture, fixture, unknownFixture];
      response = await search(request('q=running+shoes&budget=' + budget));
      const body = await response.json();
      assert.equal(response.status, 200);
      assert.equal(body.products.length, 2, 'Keep matching offers and unknown prices; exclude mismatched offers.');
      assert.deepEqual(body.products[0].price, { amount: 5699, currency }, 'A cheaper foreign-currency variant must not displace a matching offer.');
      assert.equal(body.products[1].price, null);
      assert.equal(body.warnings.length, 1);
      assert.deepEqual(body.market, expectedMarket);
      const sent = (observed as { params: { arguments: { catalog: { filters: unknown } } } }).params.arguments.catalog;
      assert.deepEqual(sent.filters, { available: true, ships_to: { country }, price: { max } });
      response = await getProduct(new NextRequest('http://localhost/api/catalog/product?id=' + encodeURIComponent(fixture.id) + '&country=' + country + '&currency=' + currency));
      assert.equal(response.status, 200);
      assert.equal((await response.json()).product.price.currency, currency, 'Details must preserve search currency.');
      response = await search(request('q=coffee+beans'));
      assert.equal(response.status, 200);
      assert.equal('price' in (observed as { params: { arguments: { catalog: { filters: object } } } }).params.arguments.catalog.filters, false);
    }
    expectedMarket = { country: 'JP', currency: 'JPY' };
    assert.equal((await search(request('q=backpack&budget=150.5'))).status, 400);
    expectedMarket = { country: 'KW', currency: 'KWD' };
    assert.equal((await search(request('q=coffee&budget=1.1234'))).status, 400);
    assert.equal(budgetInMinorUnits(1.23, 'GBP'), 123);
    assert.equal(budgetInMinorUnits(15000, 'JPY'), 15000);
    assert.equal(budgetInMinorUnits(15.125, 'KWD'), 15125);
    // Do not treat all returned currencies as the requested currency.
    expectedMarket = { country: 'CA', currency: 'CAD' };
    searchFixtures = [fixture];
    assert.deepEqual((await (await search(request())).json()).products, []);
    detailFixture = fixture;
    assert.equal((await getProduct(new NextRequest('http://localhost/api/catalog/product?id=' + encodeURIComponent(fixture.id) + '&country=CA&currency=CAD'))).status, 502);

    // Render the configured voice-tool bodies through typed template substitution,
    // then send them over real HTTP to the synthetic upstream. This exercises the
    // request contract, not the hosted Agora template engine or live speech.
    function render(value: unknown, args: Record<string, unknown>): unknown {
      if (typeof value === 'string') {
        const match = value.match(/^\{\{args\.(\w+)\}\}$/);
        return match ? args[match[1]] : value;
      }
      if (Array.isArray(value)) return value.map(item => render(item, args));
      if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, render(item, args)]));
      return value;
    }
    const tools = getScenarioTools();
    for (const price of [{ max: 15000 }, {}]) {
      const args = { query: 'coffee beans', country: 'CA', currency: 'CAD', price };
      const body = render(tools[0].server.body, args) as { params: { arguments: { catalog: { filters: { price: object; ships_to: { country: string } } } } } };
      assert.deepEqual(body.params.arguments.catalog.filters.price, price);
      assert.equal(body.params.arguments.catalog.filters.ships_to.country, 'CA');
      assert.equal((await originalFetch(origin + '/api/ucp/mcp', { method: 'POST', body: JSON.stringify(body) })).status, 200);
    }
    assert.equal((await originalFetch(origin + '/api/ucp/mcp', { method: 'POST', body: JSON.stringify(render(tools[1].server.body, { id: fixture.id, country: 'CA', currency: 'CAD' })) })).status, 200);
    expectedMarket = { country: 'US', currency: 'USD' };
    searchFixtures = [fixture, unknownFixture];
    detailFixture = fixture;

    for (const nextMode of ['sse', 'text-content', 'token']) {
      mode = nextMode;
      if (mode === 'token') process.env.SHOPIFY_CATALOG_ACCESS_TOKEN = 'fixture-token';
      assert.equal((await search(request())).status, 200, nextMode);
      delete process.env.SHOPIFY_CATALOG_ACCESS_TOKEN;
    }
    mode = 'empty';
    assert.deepEqual((await (await search(request())).json()).products, []);
    mode = 'success';
    response = await getProduct(new NextRequest('http://localhost/api/catalog/product?id=' + encodeURIComponent(fixture.id) + '&country=US&currency=USD'));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).product.checkoutUrl, 'https://example.com/cart/test:1');
    mode = 'rate-limit';
    response = await search(request());
    assert.equal(response.status, 429);
    assert.equal(response.headers.get('retry-after'), '7');
    assert.match((await response.json()).error, /7 seconds/);
    for (const nextMode of ['server-error', 'malformed', 'missing-products', 'tool-error']) {
      mode = nextMode;
      assert.equal((await search(request())).status, 502, nextMode);
    }
    mode = 'timeout';
    assert.equal((await search(request())).status, 504);
    console.log(`Shopify route and HTTP boundary checks passed: ${calls} real requests to a synthetic local upstream, including timeout and rate limiting.`);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.SHOPIFY_CATALOG_ACCESS_TOKEN; else process.env.SHOPIFY_CATALOG_ACCESS_TOKEN = originalToken;
    if (originalProfile === undefined) delete process.env.SHOPIFY_UCP_AGENT_PROFILE_URL; else process.env.SHOPIFY_UCP_AGENT_PROFILE_URL = originalProfile;
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
