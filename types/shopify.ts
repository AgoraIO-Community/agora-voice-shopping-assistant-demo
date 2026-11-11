export interface CatalogMoney { amount: number; currency: string; }
export interface CatalogMarket { country: string; currency: string; }

export interface CatalogVariant {
  id: string;
  title: string;
  merchant: string;
  description: string;
  imageUrl: string | null;
  price: CatalogMoney | null;
  available: boolean | null;
  productUrl: string | null;
  checkoutUrl: string | null;
  options: { name: string; label: string }[];
}

export interface CatalogProduct {
  id: string;
  title: string;
  description: string;
  merchant: string;
  imageUrl: string | null;
  price: CatalogMoney | null;
  available: boolean | null;
  productUrl: string | null;
  checkoutUrl: string | null;
  variants: CatalogVariant[];
}

export interface CatalogSearchResult { products: CatalogProduct[]; query: string; checkedAt: string; market: CatalogMarket; warnings: string[]; }
