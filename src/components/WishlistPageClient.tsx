"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

type WishlistItem = {
  id: string;
  variant: { title: string; product: { title: string; slug: string; images: { url: string }[] } };
};

export function WishlistPageClient() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/wishlist')
      .then((r) => r.json())
      .then((data) => setItems(data?.data?.items ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-950">Loading wishlist...</div>;
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
      {items.map((item) => (
        <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <img src={item.variant.product.images[0]?.url ?? ''} alt={item.variant.product.title} className="h-48 w-full rounded-2xl object-cover" />
          <h3 className="mt-4 font-semibold text-slate-950 dark:text-white">{item.variant.product.title}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{item.variant.title}</p>
        </article>
      ))}
    </div>
  );
}
