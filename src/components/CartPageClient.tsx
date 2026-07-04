"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

type CartItem = {
  id: string;
  quantity: number;
  subtotal: number;
  product: { title: string; slug: string; image: string | null };
  variant: { title: string };
};

export function CartPageClient() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/cart')
      .then((r) => r.json())
      .then((data) => setItems(data?.data?.items ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-950">Loading cart...</div>;
  if (!items.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-950">
        <p className="text-slate-500 dark:text-slate-400">Your cart is empty.</p>
        <Link href="/products" className="mt-4 inline-flex rounded-full bg-slate-900 px-4 py-2 text-white dark:bg-white dark:text-slate-950">Continue Shopping</Link>
      </div>
    );
  }

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_0.6fr]">
      <div className="space-y-4">
        {items.map((item) => (
          <article key={item.id} className="flex gap-4 rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <img src={item.product.image ?? ''} alt={item.product.title} className="h-24 w-24 rounded-2xl object-cover" />
            <div>
              <h3 className="font-semibold text-slate-950 dark:text-white">{item.product.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{item.variant.title}</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Qty: {item.quantity}</p>
            </div>
          </article>
        ))}
      </div>
      <aside className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Order Summary</h2>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Subtotal: ₹{(subtotal / 100).toFixed(2)}</p>
        <Link href="/products" className="mt-6 inline-flex rounded-full bg-slate-900 px-4 py-2 text-white dark:bg-white dark:text-slate-950">Continue Shopping</Link>
      </aside>
    </div>
  );
}
