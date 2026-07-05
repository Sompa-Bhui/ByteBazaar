"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useCartWishlist } from './cart-wishlist-context';

type CartItem = {
  id: string;
  quantity: number;
  subtotal: number;
  product: { title: string; slug: string; image: string | null };
  variant: { title: string };
};

export function CartPageClient() {
  const { refreshCart } = useCartWishlist();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function loadCart() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/cart');
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Unable to load cart');
      setItems(data?.data?.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load cart');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCart();
  }, []);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.subtotal, 0), [items]);

  async function updateQuantity(itemId: string, quantity: number) {
    try {
      setActionError(null);
      const response = await fetch(`/api/cart/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Unable to update item');
      await loadCart();
      await refreshCart();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update item');
    }
  }

  async function removeItem(itemId: string) {
    try {
      setActionError(null);
      const response = await fetch(`/api/cart/items/${itemId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Unable to remove item');
      await loadCart();
      await refreshCart();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to remove item');
    }
  }

  async function clearCart() {
    try {
      setActionError(null);
      const response = await fetch('/api/cart', { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Unable to clear cart');
      await loadCart();
      await refreshCart();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to clear cart');
    }
  }

  if (loading) return <div className="rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-950">Loading cart...</div>;
  if (error) return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-700 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-200">{error}</div>;
  if (!items.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-950">
        <p className="text-slate-500 dark:text-slate-400">Your cart is empty.</p>
        <Link href="/products" className="mt-4 inline-flex rounded-full bg-slate-900 px-4 py-2 text-white dark:bg-white dark:text-slate-950">Continue Shopping</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_0.6fr]">
      {actionError ? <div className="lg:col-span-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-200">{actionError}</div> : null}
      <div className="space-y-4">
        {items.map((item) => (
          <article key={item.id} className="flex gap-4 rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <img src={item.product.image ?? ''} alt={item.product.title} className="h-24 w-24 rounded-2xl object-cover" />
            <div className="flex-1">
              <h3 className="font-semibold text-slate-950 dark:text-white">{item.product.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{item.variant.title}</p>
              <div className="mt-3 flex items-center gap-2">
                <button onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))} className="rounded-full border px-3 py-1 text-sm">-</button>
                <span className="min-w-8 text-center">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="rounded-full border px-3 py-1 text-sm">+</button>
                <button onClick={() => removeItem(item.id)} className="ml-3 text-sm text-rose-600">Remove</button>
              </div>
            </div>
          </article>
        ))}
      </div>
      <aside className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Order Summary</h2>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Subtotal: ₹{(subtotal / 100).toFixed(2)}</p>
        <div className="mt-6 flex flex-col gap-3">
          <Link href="/products" className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-white dark:bg-white dark:text-slate-950">Continue Shopping</Link>
          <button onClick={clearCart} className="inline-flex rounded-full border px-4 py-2 text-sm">Clear Cart</button>
          <Link href="/checkout" className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-white dark:bg-white dark:text-slate-950">Checkout</Link>
        </div>
      </aside>
    </div>
  );
}
