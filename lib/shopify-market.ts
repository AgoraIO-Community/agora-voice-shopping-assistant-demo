import type { CatalogMarket } from '@/types/shopify';

const currencies = new Set(Intl.supportedValuesOf('currency'));

export class CatalogError extends Error {
  constructor(public status: number, message: string, public retryAfter?: number) { super(message); }
}

export const marketProperties = {
  country: { type: 'string', pattern: '^[A-Z]{2}$', description: 'Buyer-confirmed delivery country, ISO 3166-1 alpha-2. Do not infer from language or currency.' },
  currency: { type: 'string', enum: [...currencies], description: 'Buyer-confirmed ISO 4217 budget currency. A dollar sign alone is ambiguous. Requested currency does not guarantee returned offer currency.' },
};

export function validateMarket(country: string, currency: string): CatalogMarket {
  if (!/^[A-Z]{2}$/.test(country)) throw new CatalogError(400, 'Specify a two-letter delivery country code.');
  if (!currencies.has(currency)) throw new CatalogError(400, 'Specify a recognized three-letter currency code.');
  return { country, currency };
}

export function currencyDigits(currency: string): number {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits!;
}

export function budgetInMinorUnits(budget: number | undefined, currency: string): number | undefined {
  if (budget === undefined) return undefined;
  const scaled = budget * 10 ** currencyDigits(currency);
  const amount = Math.round(scaled);
  if (!Number.isFinite(budget) || budget <= 0 || !Number.isSafeInteger(amount) || amount <= 0 || Math.abs(scaled - amount) > 1e-7) {
    throw new CatalogError(400, 'Enter a positive budget within the currency precision and safe integer range.');
  }
  return amount;
}

// Keep the hosted Agent's conversion instructions aligned with diagnostic conversions.
export const currencyUnitGuidance = [0, 3, 4].map(digits => {
  const codes = [...currencies].filter(currency => currencyDigits(currency) === digits);
  return codes.length ? `${digits}-decimal currencies: ${codes.join(', ')}.` : '';
}).filter(Boolean).join(' ') + ' Other listed currencies use 2 decimal places. Multiply a budget by 10 to that decimal power; divide returned minor-unit prices by the same factor.';
