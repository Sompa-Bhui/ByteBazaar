"use client";

import { useEffect, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { Badge } from './ui/Badge';
import { Card, CardBody } from './ui/Cards';
import { Button } from './ui/Button';
import { useCartWishlist } from './cart-wishlist-context';
import { MarketplaceImage } from './MarketplaceImage';
import { formatINR } from '@/lib/format';

export type ProductCardData = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  price: number;
  badge?: string;
  image: string;
  rating: number;
  techSignal: string;
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
      setWishlisted(Boolean(data?.data?.wished));
      await refreshWishlist();
    } catch {
      // keep existing state on error
    } finally {
      setMutating(false);
    }
  }

  return (
    <Card className="group border-slate-200/80 bg-white/95 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-950/95">
      <div className="relative overflow-hidden bg-slate-100">
        <Link href={`/products/${product.slug}`} className="block">
          <div className="relative aspect-[4/3]">
            <MarketplaceImage
              src={product.image}
              alt={product.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          </div>
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
      <CardBody className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">{product.subtitle}</p>
            <h3 className="mt-2 line-clamp-2 text-lg font-semibold leading-snug text-slate-950 dark:text-white">{product.title}</h3>
          </div>
          {product.badge ? <Badge>{product.badge}</Badge> : null}
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xl font-semibold text-slate-950 dark:text-white">{formatINR(product.price)}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{product.rating.toFixed(1)} ★</p>
          </div>
          <Button as="a" href={`/products/${product.slug}`} variant="secondary" size="sm" className="shrink-0">
            View
          </Button>
        </div>
        <p className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          {product.techSignal}
        </p>
        <Button as="a" href={`/products/${product.slug}`} size="sm" className="w-full">
          Add to Cart
        </Button>
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


