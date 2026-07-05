"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCartWishlist } from './cart-wishlist-context';

type WishlistItem = {
  id: string;
  variant: { id: string; title: string; product: { title: string; slug: string; images: { url: string }[] } };
};

export function WishlistPageClient() {
  const { refreshCart, refreshWishlist } = useCartWishlist();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function loadWishlist() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/wishlist');
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Unable to load wishlist');
      setItems(data?.data?.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load wishlist');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWishlist();
  }, []);

  async function removeItem(itemId: string) {
    try {
      setActionError(null);
      const response = await fetch(`/api/wishlist/items/${itemId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Unable to remove item');
      await loadWishlist();
      await refreshWishlist();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to remove item');
    }
  }

  async function moveToCart(item: WishlistItem) {
    try {
      setActionError(null);
      const response = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId: item.variant.id, quantity: 1 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Unable to add to cart');
      await removeItem(item.id);
      await refreshCart();
      await refreshWishlist();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to add to cart');
    }
  }

  if (loading) return <div className="rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-950">Loading wishlist...</div>;
  if (error) return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-700 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-200">{error}</div>;
  if (!items.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-950">
        <p className="text-slate-500 dark:text-slate-400">Your wishlist is empty.</p>
        <Link href="/products" className="mt-4 inline-flex rounded-full bg-slate-900 px-4 py-2 text-white dark:bg-white dark:text-slate-950">Discover Products</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {actionError ? <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-200">{actionError}</div> : null}
      {items.map((item) => (
        <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <img src={item.variant.product.images[0]?.url ?? ''} alt={item.variant.product.title} className="h-48 w-full rounded-2xl object-cover" />
          <h3 className="mt-4 font-semibold text-slate-950 dark:text-white">{item.variant.product.title}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{item.variant.title}</p>
          <div className="mt-4 flex gap-3">
            <button onClick={() => removeItem(item.id)} className="rounded-full border px-3 py-2 text-sm">Remove</button>
            <button onClick={() => moveToCart(item)} className="rounded-full border px-3 py-2 text-sm">Move to cart</button>
          </div>
        </article>
      ))}
    </div>
  );
}
