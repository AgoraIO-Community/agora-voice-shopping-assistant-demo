import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Agent } from 'agora-agents';
import { NextRequest } from 'next/server';
import { getScenarioTools } from '../lib/agent-tools';
import { SHOPIFY_CATALOG_ENDPOINT, SHOPIFY_EXAMPLE_PROFILE } from '../lib/shopify-config';
import { getScenarioConfig, getScenarioPrompt } from '../lib/agent-config';
import { getScenarioPresentation } from '../lib/presentation';
import { normalizeTranscript } from '../lib/conversation';

async function main() {
  const context = '\n[Catalog context: gid://shopify/ProductVariant/12345]';
  const message = (uid: string, text: string) => ({ uid, text, turn_id: 1 }) as Parameters<typeof normalizeTranscript>[0][number];
  const visible = normalizeTranscript([
    message('0', 'Tell me about Example Mic. My budget is USD 150.' + context),
    message('voice-user', 'Please compare two microphones.'),
    message('agent', 'Agent text' + context),
    message('voice-user', 'The product ID is gid://shopify/ProductVariant/12345.'),
  ], 'voice-user');
  assert.equal(visible[0].text, 'Tell me about Example Mic. My budget is USD 150.');
  assert.equal(visible[0].uid, 'voice-user');
  assert.equal(visible[1].text, 'Please compare two microphones.');
  assert.equal(visible[2].text, 'Agent text' + context);
  assert.equal(visible[3].text, 'The product ID is gid://shopify/ProductVariant/12345.');
  const config = getScenarioConfig();
  assert.equal(getScenarioPresentation().id, config.id);
  const tools = getScenarioTools();
  assert.deepEqual(tools.map(tool => tool.function.name), ['SearchShopifyProducts', 'GetShopifyProduct']);
  assert.match(getScenarioPrompt(), /live, read-only Shopify/);
  assert.match(getScenarioPrompt(), /structuredContent/);
  for (const tool of tools) {
    assert.equal(tool.server.url, SHOPIFY_CATALOG_ENDPOINT);
    assert.equal(tool.server.method, 'POST');
    assert.equal(tool.server.headers?.Accept, 'application/json');
    const body = tool.server.body as { params: { arguments: { meta: { 'ucp-agent': { profile: string } }; catalog: { context: { currency: string; address_country: string } } } } };
    assert.equal(body.params.arguments.meta['ucp-agent'].profile, process.env.SHOPIFY_UCP_AGENT_PROFILE_URL || SHOPIFY_EXAMPLE_PROFILE);
    assert.equal(body.params.arguments.catalog.context.currency, '{{args.currency}}');
    assert.equal(body.params.arguments.catalog.context.address_country, '{{args.country}}');
  }
  const landing = fs.readFileSync('components/LandingPage.tsx', 'utf8');
  assert.doesNotMatch(landing, /api\/scenarios|shopping_session_id|event_session_id|followUpApi|useShopping|useFollowUps/);

  process.env.NEXT_PUBLIC_AGORA_APP_ID = '0123456789abcdef0123456789abcdef';
  process.env.NEXT_AGORA_APP_CERTIFICATE = 'fedcba9876543210fedcba9876543210';
  const { POST } = await import('../app/api/invite-agent/route');
  const originalCreate = Agent.prototype.createSession;
  let captured: Agent | null = null;
  let sessionOptions: unknown;
  let starts = 0;
  Agent.prototype.createSession = (function (this: Agent, options: unknown) {
    captured = this;
    sessionOptions = options;
    return { start: async () => { starts += 1; return 'read-only-shopping-agent'; } };
  }) as unknown as typeof Agent.prototype.createSession;
  try {
    const response = await POST(new NextRequest('http://localhost/api/invite-agent', {
      method: 'POST',
      body: JSON.stringify({ requester_id: 'voice-user', channel_name: 'shopping-channel' }),
    }));
    const result = await response.json();
    assert.equal(response.status, 200, JSON.stringify(result));
    assert.equal(result.agent_id, 'read-only-shopping-agent');
    const actual = captured as unknown as Agent;
    assert.equal(actual.advancedFeatures?.enable_rtm, true);
    assert.equal(actual.advancedFeatures?.enable_tools, true);
    assert.equal(actual.fillerWords?.enable, true, 'Waiting feedback must use the built-in filler configuration.');
    assert.deepEqual(actual.fillerWords?.trigger, {
      mode: 'fixed_time',
      fixed_time_config: { response_wait_ms: 1500 },
    });
    assert.equal(actual.fillerWords?.content?.mode, 'static', 'Waiting feedback must not require another LLM request.');
    const phrases = actual.fillerWords?.content?.static_config?.phrases ?? [];
    assert.ok(phrases.length > 0 && phrases.every(phrase => phrase.trim().length > 0 && phrase.trim().split(/\s+/).length <= 50));
    assert.deepEqual(actual.llm?.tools, getScenarioTools());
    assert.deepEqual(actual.llm?.mcp_servers ?? [], [], 'Use the HTTP adapter for structured-content-only replies.');
    assert.deepEqual((sessionOptions as { remoteUids: string[] }).remoteUids, ['voice-user']);
    assert.equal(actual.instructions, getScenarioPrompt(config.id));
    assert.equal(starts, 1);
  } finally {
    Agent.prototype.createSession = originalCreate;
  }
  console.log('Read-only Shopify startup and product-context display checks passed.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
