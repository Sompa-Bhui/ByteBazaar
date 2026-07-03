import { notFound } from 'next/navigation';
import { motion } from 'framer-motion';
import { getProductBySlug, getProductReviewSummary, getProductReviews, getRelatedProducts, getFrequentlyBoughtTogether, StorefrontProductDetail } from '@/lib/storefront';
import ProductBreadcrumbs from '@/components/ProductBreadcrumbs';
import ProductSpecifications from '@/components/ProductSpecifications';
import ProductReviewList from '@/components/ProductReviewList';
import RelatedProducts from '@/components/RelatedProducts';
import FrequentlyBoughtTogether from '@/components/FrequentlyBoughtTogether';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SectionHeading } from '@/components/ui/SectionHeading';

const getProductImage = (product: StorefrontProductDetail) => {
  if (product.coverImageId) {
    const cover = product.images.find((image) => image.id === product.coverImageId);
    if (cover) return cover.url;
  }
  return product.images[0]?.url ?? 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80';
};

function formatPrice(value: number) {
  return `₹${(value / 100).toFixed(2)}`;
}

function getPriceLabel(product: StorefrontProductDetail) {
  return product.msrp && product.msrp > product.price ? `₹${(product.msrp / 100).toFixed(2)} MSRP` : 'Best price';
}

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();

  const reviewSummary = await getProductReviewSummary(product.id);
  const reviewData = await getProductReviews(product.id);
  const relatedProducts = await getRelatedProducts(product.id, product.categories[0]?.slug, product.brand?.slug);
  const frequentlyBought = await getFrequentlyBoughtTogether(product.id);

  const heroImage = getProductImage(product);
  const firstVariant = product.variants[0];
  const stockCount = firstVariant?.inventory?.quantityOnHand ?? 0;
  const stockLabel = stockCount > 0 ? 'In stock' : 'Out of stock';

  return (
    <div className="container mx-auto py-16">
      <ProductBreadcrumbs categories={product.categories} productTitle={product.title} />
      <div className="grid gap-12 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-8">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="relative grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
              <div className="relative overflow-hidden bg-slate-900">
                <motion.img
                  initial={{ opacity: 0.85 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  src={heroImage}
                  alt={product.title}
                  className="h-full w-full object-cover"
                  loading="eager"
                />
              </div>
              <div className="space-y-4 p-6 lg:p-8">
                <div className="grid gap-3 sm:grid-cols-2">
                  {product.images.slice(0, 4).map((image) => (
                    <div key={image.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                      <img src={image.url} alt={image.altText ?? product.title} loading="lazy" className="h-40 w-full object-cover" />
                    </div>
                  ))}
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <h1 className="text-3xl font-semibold text-slate-950 dark:text-white">{product.title}</h1>
                  <p className="mt-3 text-sm uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">{product.brand?.name ?? 'ByteBazaar'}</p>
                  <div className="mt-6 flex flex-wrap items-center gap-4">
                    <div>
                      <p className="text-4xl font-semibold text-slate-950 dark:text-white">{formatPrice(product.price)}</p>
                      {product.msrp && product.msrp > product.price ? (
                        <p className="text-sm text-slate-500 line-through dark:text-slate-400">{formatPrice(product.msrp)}</p>
                      ) : null}
                    </div>
                    <Badge>{stockLabel}</Badge>
                  </div>
                  <p className="mt-6 text-slate-600 dark:text-slate-300">{product.shortDesc ?? product.description}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Rating</p>
                    <p className="text-3xl font-semibold text-slate-950 dark:text-white">{reviewSummary.averageRating.toFixed(1)} ★</p>
                  </div>
                  <div className="space-y-2 text-right">
                    <p className="text-sm text-slate-500 dark:text-slate-400">{reviewSummary.reviewCount} reviews</p>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Powered by ByteBazaar reviews</p>
                  </div>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl bg-slate-50 p-5 dark:bg-slate-900">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Model</p>
                    <p className="mt-2 text-base font-semibold text-slate-900 dark:text-white">{product.title}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-5 dark:bg-slate-900">
                    <p className="text-sm text-slate-500 dark:text-slate-400">SKU</p>
                    <p className="mt-2 text-base font-semibold text-slate-900 dark:text-white">{firstVariant?.sku ?? 'N/A'}</p>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <SectionHeading title="Select variant" subtitle="Choose color, storage, RAM, or size." />
                <div className="grid gap-4 sm:grid-cols-2">
                  {product.variants.map((variant) => (
                    <div key={variant.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
                      <p className="text-sm text-slate-500 dark:text-slate-400">{variant.title}</p>
                      <p className="mt-2 text-base font-semibold text-slate-950 dark:text-white">{variant.sku ?? 'SKU unavailable'}</p>
                      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{variant.inventory?.quantityOnHand ?? 0} in stock</p>
                    </div>
                  ))}
                </div>
              </section>

              <ProductSpecifications product={product} />
            </div>

            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Product details</h2>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">A premium presentation for every detail.</p>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200">{getPriceLabel(product)}</div>
                </div>
                <div className="mt-6 space-y-4 text-slate-600 dark:text-slate-300">
                  <p>{product.description}</p>
                  <p>{product.variants.length} variant{product.variants.length === 1 ? '' : 's'} available.</p>
                  <p>{product.categories.map((category) => category.name).join(', ')}</p>
                </div>
              </section>

              <FrequentlyBoughtTogether products={frequentlyBought} />
            </div>
          </div>

          <ProductReviewList
            reviews={reviewData.reviews}
            averageRating={reviewSummary.averageRating}
            totalReviews={reviewSummary.reviewCount}
            page={reviewData.page}
            totalPages={reviewData.totalPages}
          />

          <RelatedProducts products={relatedProducts} />
        </section>
      </div>
    </div>
  );
}
