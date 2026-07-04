import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductBreadcrumbs from '@/components/ProductBreadcrumbs';
import ProductSpecifications from '@/components/ProductSpecifications';
import ProductReviewList from '@/components/ProductReviewList';
import RelatedProducts from '@/components/RelatedProducts';
import FrequentlyBoughtTogether from '@/components/FrequentlyBoughtTogether';
import ProductDetailClient from '@/components/ProductDetailClient';
import { getProductBySlug, getProductReviewSummary, getProductReviews, getRelatedProducts, getFrequentlyBoughtTogether } from '@/lib/storefront';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: 'Product not found | ByteBazaar' };
  return {
    title: `${product.title} | ByteBazaar`,
    description: product.shortDesc ?? product.description ?? `Shop ${product.title} on ByteBazaar.`,
  };
}

export default async function ProductDetailPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const reviewPage = Number.parseInt(Array.isArray(resolvedSearchParams.reviewPage) ? resolvedSearchParams.reviewPage[0] : resolvedSearchParams.reviewPage ?? '1', 10) || 1;
  const reviewSummary = await getProductReviewSummary(product.id);
  const reviewData = await getProductReviews(product.id, reviewPage);
  const relatedProducts = await getRelatedProducts(product.id, product.categories[0]?.slug, product.brand?.slug);
  const frequentlyBought = await getFrequentlyBoughtTogether(product.id);

  return (
    <div className="container mx-auto py-16">
      <ProductBreadcrumbs categories={product.categories} productTitle={product.title} />
      <div className="space-y-8">
        <ProductDetailClient product={product} />
        <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-8">
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
            </section>
            <ProductSpecifications product={product} />
          </div>
          <div className="space-y-8">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Product details</h2>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Selected details are shown in the interactive panel. Browsing state stays in the URL where it matters.</p>
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
          productSlug={product.slug}
        />
        <RelatedProducts products={relatedProducts} />
      </div>
    </div>
  );
}
