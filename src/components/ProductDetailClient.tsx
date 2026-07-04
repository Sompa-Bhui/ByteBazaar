"use client";

import { useEffect, useMemo, useState } from 'react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { SectionHeading } from './ui/SectionHeading';
import type { StorefrontProductDetail } from '@/lib/storefront';

type DetailVariant = StorefrontProductDetail['variants'][number];

function formatPrice(value: number) {
  return `₹${(value / 100).toFixed(2)}`;
}

function getVariantPrice(variant: DetailVariant | undefined, fallback: number) {
  return variant?.price ?? fallback;
}

export default function ProductDetailClient({ product }: { product: StorefrontProductDetail }) {
  const [selectedVariantId, setSelectedVariantId] = useState(product.variants[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);
  const [loadingCart, setLoadingCart] = useState(false);
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedVariant = useMemo(
    () => product.variants.find((variant) => variant.id === selectedVariantId) ?? product.variants[0],
    [product.variants, selectedVariantId],
  );

  const selectedImages = selectedVariant?.images.length ? selectedVariant.images : product.images;
  const coverUrl = selectedImages[0]?.url ?? product.images[0]?.url ?? '';
  const stockCount = selectedVariant?.inventory?.quantityOnHand ?? 0;
  const availability = stockCount > 0 ? 'In stock' : 'Out of stock';
  const isOnSale = selectedVariant?.compareAt && selectedVariant.compareAt > getVariantPrice(selectedVariant, product.price);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/wishlist')
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return;
        const items = data?.data?.items ?? [];
        const isWished = items.some((item: { variantId?: string }) => item.variantId === selectedVariant?.id);
        setWishlisted(Boolean(isWished));
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [selectedVariant?.id]);

  async function addToCart() {
    if (!selectedVariant || stockCount <= 0 || loadingCart) return;
    setLoadingCart(true);
    setMessage(null);
    try {
      const response = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId: selectedVariant.id, quantity }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Unable to add to cart');
      setMessage('Added to cart');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to add to cart');
    } finally {
      setLoadingCart(false);
    }
  }

  async function toggleWishlist() {
    if (!selectedVariant || loadingWishlist) return;
    setLoadingWishlist(true);
    setMessage(null);
    try {
      const response = await fetch('/api/wishlist/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId: selectedVariant.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Unable to update wishlist');
      setWishlisted(Boolean(data?.data?.wished));
      setMessage(data?.data?.wished ? 'Added to wishlist' : 'Removed from wishlist');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update wishlist');
    } finally {
      setLoadingWishlist(false);
    }
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="space-y-6">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <img src={coverUrl} alt={selectedVariant?.title ?? product.title} className="aspect-square w-full object-cover" />
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          {selectedImages.slice(0, 4).map((image) => (
            <button key={image.id} type="button" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <img src={image.url} alt={image.altText ?? product.title} className="h-28 w-full object-cover" />
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold text-slate-950 dark:text-white">{product.title}</h1>
              <p className="mt-2 text-sm uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">{product.brand?.name ?? 'ByteBazaar'}</p>
            </div>
            <Badge>{availability}</Badge>
          </div>
          <div className="mt-6 flex flex-wrap items-end gap-4">
            <div>
              <p className="text-4xl font-semibold text-slate-950 dark:text-white">{formatPrice(getVariantPrice(selectedVariant, product.price))}</p>
              {isOnSale && selectedVariant?.compareAt ? <p className="text-sm text-slate-500 line-through dark:text-slate-400">{formatPrice(selectedVariant.compareAt)}</p> : null}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{stockCount} available</p>
          </div>
          <p className="mt-6 text-slate-600 dark:text-slate-300">{product.shortDesc ?? product.description}</p>

          <div className="mt-8 space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Variants</p>
            <div className="flex flex-wrap gap-3">
              {product.variants.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => setSelectedVariantId(variant.id)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    variant.id === selectedVariant?.id
                      ? 'border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950'
                      : 'border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
                  }`}
                >
                  {variant.title}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 dark:border-slate-800">
              <span className="text-sm text-slate-500 dark:text-slate-400">Qty</span>
              <input
                type="number"
                min={1}
                max={Math.max(stockCount, 1)}
                value={quantity}
                onChange={(event) => setQuantity(Math.max(1, Math.min(stockCount || 99, Number(event.target.value) || 1)))}
                className="w-16 border-0 bg-transparent text-center text-sm outline-none"
              />
            </label>
            <Button as="button" type="button" onClick={addToCart} disabled={stockCount <= 0 || loadingCart} className="min-w-40">
              {loadingCart ? 'Adding...' : 'Add to cart'}
            </Button>
            <Button as="button" type="button" onClick={toggleWishlist} variant="secondary" disabled={loadingWishlist}>
              {loadingWishlist ? 'Updating...' : wishlisted ? 'Saved to wishlist' : 'Add to wishlist'}
            </Button>
          </div>
          {message ? <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{message}</p> : null}
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <SectionHeading title="Description" subtitle="Product story, use cases, and what to expect." />
          <div className="mt-6 space-y-4 text-slate-600 dark:text-slate-300">
            <p>{product.description ?? product.shortDesc ?? 'No description available yet.'}</p>
            <p>Selected variant: {selectedVariant?.title ?? 'Default configuration'}</p>
          </div>
        </section>
      </section>
    </div>
  );
}
