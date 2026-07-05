import type { Metadata } from 'next';
import { searchProducts, getProductFilters, StorefrontSearchParams } from '@/lib/storefront';
import { ProductCard } from '@/components/ProductCard';
import { Button } from '@/components/ui/Button';
import { SectionHeading } from '@/components/ui/SectionHeading';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Products | ByteBazaar',
  description: 'Browse workspace products with live search, category, brand, price, and sort filters.',
};

const sortOptions = [
  { label: 'Newest', value: 'newest' },
  { label: 'Price: Low to High', value: 'price-asc' },
  { label: 'Price: High to Low', value: 'price-desc' },
  { label: 'Title: A to Z', value: 'title-asc' },
  { label: 'Title: Z to A', value: 'title-desc' },
];

const priceRanges = [
  { label: 'Under ₹15,000', value: '0-15000' },
  { label: '₹15,000 - ₹30,000', value: '15000-30000' },
  { label: '₹30,000 - ₹50,000', value: '30000-50000' },
  { label: 'Over ₹50,000', value: '50000-999999' },
];

function normalizeSearchParams(searchParams: Record<string, string | string[] | undefined>): StorefrontSearchParams {
  return {
    q: Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q,
    category: Array.isArray(searchParams.category) ? searchParams.category[0] : searchParams.category,
    brand: Array.isArray(searchParams.brand) ? searchParams.brand[0] : searchParams.brand,
    price: Array.isArray(searchParams.price) ? searchParams.price[0] : searchParams.price,
    sort: Array.isArray(searchParams.sort) ? searchParams.sort[0] : searchParams.sort,
    page: Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page,
  };
}

function buildQuery(params: URLSearchParams, key: string, value: string | undefined) {
  const next = new URLSearchParams(params);
  if (!value) {
    next.delete(key);
  } else {
    next.set(key, value);
  }
  if (key !== 'page') next.delete('page');
  const query = next.toString();
  return query ? `/products?${query}` : '/products';
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = await getProductFilters();
  const normalizedSearchParams = normalizeSearchParams(await searchParams);
  const result = await searchProducts(normalizedSearchParams);
  const params = new URLSearchParams(
    Object.entries(normalizedSearchParams).filter(([, value]) => typeof value === 'string' && value.length > 0) as string[][],
  );

  return (
    <div className="container mx-auto py-16">
      <div className="grid gap-10 xl:grid-cols-[280px_1fr]">
        <aside className="space-y-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div>
            <h2 className="text-lg font-semibold">Filters</h2>
            <p className="mt-2 text-sm text-slate-500">Search, category, brand, price, and sort are all reflected in the URL.</p>
          </div>

          <div className="space-y-4">
            <div>
              <SectionHeading title="Search" />
              <form action="/products" className="mt-3">
                <label className="sr-only" htmlFor="q">
                  Search products
                </label>
                <input
                  id="q"
                  name="q"
                  defaultValue={normalizedSearchParams.q ?? ''}
                  placeholder="Search products"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-slate-600 dark:focus:ring-slate-800"
                />
                <button type="submit" className="mt-3 inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
                  Apply search
                </button>
              </form>
            </div>

            <div>
              <SectionHeading title="Category" />
              <div className="mt-3 space-y-2">
                <Button as="a" href={buildQuery(params, 'category', undefined)} variant={!normalizedSearchParams.category ? 'primary' : 'secondary'} size="sm">
                  All categories
                </Button>
                {filters.categories.map((category) => (
                  <Button key={category.value} as="a" href={buildQuery(params, 'category', category.value)} variant={normalizedSearchParams.category === category.value ? 'primary' : 'secondary'} size="sm">
                    {category.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <SectionHeading title="Brand" />
              <div className="mt-3 space-y-2">
                <Button as="a" href={buildQuery(params, 'brand', undefined)} variant={!normalizedSearchParams.brand ? 'primary' : 'secondary'} size="sm">
                  All brands
                </Button>
                {filters.brands.map((brand) => (
                  <Button key={brand.value} as="a" href={buildQuery(params, 'brand', brand.value)} variant={normalizedSearchParams.brand === brand.value ? 'primary' : 'secondary'} size="sm">
                    {brand.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <SectionHeading title="Price" />
              <div className="mt-3 space-y-2">
                {priceRanges.map((range) => (
                  <Button key={range.value} as="a" href={buildQuery(params, 'price', range.value)} variant={normalizedSearchParams.price === range.value ? 'primary' : 'secondary'} size="sm">
                    {range.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <SectionHeading title="Sort" />
              <div className="mt-3 space-y-2">
                {sortOptions.map((option) => (
                  <Button key={option.value} as="a" href={buildQuery(params, 'sort', option.value)} variant={normalizedSearchParams.sort === option.value ? 'primary' : 'secondary'} size="sm">
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <section className="space-y-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold">Products</h1>
                <p className="mt-2 text-sm text-slate-500">Showing {result.total} products matching your filters.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <span>
                  {result.page} / {result.totalPages}
                </span>
                <span>•</span>
                <span>{result.pageSize} per page</span>
              </div>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {result.products.length === 0 ? (
              <div className="col-span-full rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-950">No products match these filters.</div>
            ) : (
              result.products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={{
                    id: product.id,
                    slug: product.slug,
                    title: product.title,
                    subtitle: product.categoryNames[0] ?? product.brand,
                    price: product.price,
                    image: product.image,
                    rating: 4.7,
                  }}
                />
              ))
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="text-sm text-slate-500">
              Page {result.page} of {result.totalPages}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {result.page <= 1 ? (
                <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-400 dark:bg-slate-900 dark:text-slate-600">Previous</span>
              ) : (
                <Button as="a" href={buildQuery(params, 'page', Math.max(1, result.page - 1).toString())} variant="secondary" size="sm">
                  Previous
                </Button>
              )}
              {result.page >= result.totalPages ? (
                <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-400 dark:bg-slate-900 dark:text-slate-600">Next</span>
              ) : (
                <Button as="a" href={buildQuery(params, 'page', Math.min(result.totalPages, result.page + 1).toString())} variant="secondary" size="sm">
                  Next
                </Button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
