"use client";

import { useEffect, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { Badge } from './ui/Badge';
import { Card, CardBody } from './ui/Cards';
import { Button } from './ui/Button';
import { useCartWishlist } from './cart-wishlist-context';

export type ProductCardData = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  price: number;
  badge?: string;
  image: string;
  rating: number;
};

export function ProductCard({ product }: { product: ProductCardData }) {
  const { isWishlistedProduct, refreshWishlist } = useCartWishlist();
  const [mutating, setMutating] = useState(false);
  const [wishlisted, setWishlisted] = useState(isWishlistedProduct(product.id));

  useEffect(() => {
    setWishlisted(isWishlistedProduct(product.id));
  }, [isWishlistedProduct, product.id]);

  async function toggleWishlist(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (mutating) return;
    setMutating(true);
    try {
      const response = await fetch('/api/wishlist/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/sign-in';
          return;
        }
        throw new Error(data?.error ?? 'Unable to update wishlist');
      }
      const wished = Boolean(data?.data?.wished);
      setWishlisted(wished);
      await refreshWishlist();
    } catch {
      // keep existing state on error
    } finally {
      setMutating(false);
    }
  }

  return (
    <Card className="group">
      <div className="relative">
        <Link href={`/products/${product.slug}`} className="block overflow-hidden rounded-3xl bg-slate-100">
          <img
            src={product.image}
            alt={product.title}
            className="h-72 w-full object-cover"
          />
        </Link>
        <button
          type="button"
          onClick={toggleWishlist}
          disabled={mutating}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          className={[
            'absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur transition',
            wishlisted
              ? 'border-rose-300/30 bg-rose-500/15 text-rose-500'
              : 'border-slate-200 bg-white/90 text-slate-700 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-200',
            mutating ? 'cursor-wait opacity-60' : 'hover:scale-105',
          ].join(' ')}
        >
          <HeartIcon filled={wishlisted} />
        </button>
      </div>
      <CardBody>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{product.subtitle}</p>
            <h3 className="mt-3 text-xl font-semibold text-slate-950 dark:text-white">{product.title}</h3>
          </div>
          {product.badge ? <Badge>{product.badge}</Badge> : null}
        </div>
        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-2xl font-semibold text-slate-950 dark:text-white">₹{(product.price / 100).toFixed(2)}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{product.rating.toFixed(1)} ★</p>
          </div>
          <Button as="a" href={`/products/${product.slug}`} variant="secondary" size="sm">
            View
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5">
      <path d="M12 21s-7-4.4-9.2-9.2A5.8 5.8 0 0 1 12 5.2a5.8 5.8 0 0 1 9.2 6.6C19 16.6 12 21 12 21Z" />
    </svg>
  );
}
