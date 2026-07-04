import Link from 'next/link';
import { Badge } from './ui/Badge';
import { SectionHeading } from './ui/SectionHeading';
import type { StorefrontReview } from '@/lib/storefront';

export default function ProductReviewList({
  reviews,
  averageRating,
  totalReviews,
  page,
  totalPages,
  productSlug,
}: {
  reviews: StorefrontReview[];
  averageRating: number;
  totalReviews: number;
  page: number;
  totalPages: number;
  productSlug?: string;
}) {
  const queryPrefix = productSlug ? `/products/${productSlug}` : '';

  return (
    <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SectionHeading title="Customer reviews" subtitle="Real feedback from verified purchases." />
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{totalReviews} reviews · {averageRating.toFixed(1)} average rating</p>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-slate-50 px-5 py-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
          <p className="font-semibold">Average Rating</p>
          <p className="text-3xl font-semibold">{averageRating.toFixed(1)}</p>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          No reviews yet. Be the first to write one.
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-950 dark:text-white">{review.title || 'Customer review'}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{review.userName}</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <span>{review.rating.toFixed(1)} ★</span>
                  {review.verifiedPurchase ? <Badge>Verified purchase</Badge> : null}
                </div>
              </div>
              <p className="mt-4 text-slate-700 dark:text-slate-200">{review.body ?? 'No review text provided.'}</p>
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{new Date(review.createdAt).toLocaleDateString()}</p>
            </article>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
        <p>Page {page} of {totalPages}</p>
        <div className="flex gap-2">
          <Link href={`${queryPrefix}?reviewPage=${Math.max(1, page - 1)}`} className={`rounded-full border px-4 py-2 ${page <= 1 ? 'cursor-not-allowed border-slate-200 text-slate-300 dark:border-slate-800 dark:text-slate-600' : 'border-slate-200 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:text-slate-200'}`}>
            Previous
          </Link>
          <Link href={`${queryPrefix}?reviewPage=${Math.min(totalPages, page + 1)}`} className={`rounded-full border px-4 py-2 ${page >= totalPages ? 'cursor-not-allowed border-slate-200 text-slate-300 dark:border-slate-800 dark:text-slate-600' : 'border-slate-200 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:text-slate-200'}`}>
            Next
          </Link>
        </div>
      </div>
    </section>
  );
}
