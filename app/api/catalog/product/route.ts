import { NextRequest, NextResponse } from 'next/server';
import { CatalogError, getShopifyProduct } from '@/lib/shopify-catalog';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const headers = { 'Cache-Control': 'no-store, max-age=0' };
  try {
    const params = request.nextUrl.searchParams;
    return NextResponse.json({ product: await getShopifyProduct(params.get('id') || '',
      { country: params.get('country') || '', currency: params.get('currency') || '' }) }, { headers });
  } catch (error) {
    const failure = error instanceof CatalogError ? error : new CatalogError(500, 'Product details are unavailable. Please try again.');
    return NextResponse.json({ error: failure.message }, { status: failure.status,
      headers: { ...headers, ...(failure.retryAfter ? { 'Retry-After': String(failure.retryAfter) } : {}) } });
  }
}
