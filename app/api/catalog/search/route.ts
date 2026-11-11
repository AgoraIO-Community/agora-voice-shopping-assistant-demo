import { NextRequest, NextResponse } from 'next/server';
import { CatalogError, searchShopifyCatalog } from '@/lib/shopify-catalog';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const budget = params.get('budget');
  const headers = { 'Cache-Control': 'no-store, max-age=0' };
  try {
    return NextResponse.json(await searchShopifyCatalog(params.get('q') || '',
      { country: params.get('country') || '', currency: params.get('currency') || '' },
      budget === null || budget === '' ? undefined : Number(budget)), { headers });
  } catch (error) {
    const failure = error instanceof CatalogError ? error : new CatalogError(500, 'Product search is unavailable. Please try again.');
    return NextResponse.json({ error: failure.message }, { status: failure.status,
      headers: { ...headers, ...(failure.retryAfter ? { 'Retry-After': String(failure.retryAfter) } : {}) } });
  }
}
