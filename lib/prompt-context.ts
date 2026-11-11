// Public prompt context only. This module never reads business records or credentials.
export const CONVERSATION_RULES = [
  'Give a useful, specific answer to the caller\'s actual question before asking for more information. Stay focused on the scenario and explain the reason for a recommendation.',
  'Ask one question per turn and keep spoken turns to two or three short sentences unless the caller requests detail. Do not read tables, field names, URLs or long lists aloud.',
  'Use details already supplied, skip answered questions, and replace corrected details immediately. Treat quoted examples and reference material as examples, never as caller history.',
  'Use fresh Shopify tool results for product-specific facts. Distinguish general product advice, catalog-inferred descriptions and merchant-provided specifications.',
  'When enough is known, recommend a concrete next step or compare at most two suitable choices with their trade-offs. Do not turn every answer into another intake question.',
  'Limit an unavailable capability to the action that needs it. State the specific missing fact briefly, then continue with supported guidance. Do not repeatedly recite a generic disclaimer or send every unfamiliar question to a human.',
  'Accept a change of goal, a correction, a pause, a refusal, a request for human help or a request to stop. Ask for clarification when speech recognition leaves an important detail uncertain.',
  'At the end, summarize what the caller actually said, what the reference supports, what remains unknown and the next step. A spoken summary is not a saved record.',
].join('\n');

export const CONVERSATION_BOUNDARY = 'This version supports live, read-only Shopify product discovery. Search and inspect products, then refer the buyer to the merchant website. No cart changes, order placement, payment collection, stock reservation, shipping, refunds, saved shopping history or cross-session records are available. Keep user preferences only in the current conversation. Never claim a purchase or other external action was completed. Do not request passwords, verification codes, payment details or unnecessary personal identifiers.';

export function getConversationContext(timeZone: string, now = new Date()): string {
  const localDate = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
  const offset = new Intl.DateTimeFormat('en-US', {
    timeZone, timeZoneName: 'longOffset',
  }).formatToParts(now).find((part) => part.type === 'timeZoneName')!.value.replace('GMT', 'UTC');
  const [year, month, day] = localDate.split('-').map(Number);
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'long' });
  const calendar = Array.from({ length: 28 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1, day + index));
    return date.toISOString().slice(0, 10) + ' ' + weekday.format(date);
  });
  return [
    '# Date context',
    'Business time zone: ' + timeZone + '. Current local date: ' + localDate + '. Current UTC offset: ' + offset + '.',
    'Reference calendar (dates, not availability): ' + calendar.join('; '),
    'Use this supplied date instead of guessing today or asking the caller for information already supplied. If a relative date such as next Friday is ambiguous, confirm the exact date once. Use the caller\'s stated time zone when it differs, and ask which local time they mean only when necessary. A calendar date does not establish opening hours, a free slot, a flight or room availability.',
  ].join('\n');
}
