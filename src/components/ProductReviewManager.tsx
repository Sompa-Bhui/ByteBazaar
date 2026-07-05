"use client";

import { useCallback, useEffect, useState } from 'react';

type ReviewItem = { id: string; rating: number; title: string | null; body: string | null; verifiedPurchase: boolean; userName?: string };

export function ProductReviewManager({ productId }: { productId: string }) {
  const [mine, setMine] = useState<ReviewItem | null>(null);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/products/${productId}/reviews`);
    const json = await res.json();
    setMine(json.mine ?? null);
    if (json.mine) {
      setRating(json.mine.rating);
      setTitle(json.mine.title ?? '');
      setBody(json.mine.body ?? '');
    }
  }, [productId]);

  useEffect(() => { void load(); }, [load]);

  async function submit() {
    const method = mine ? 'PATCH' : 'POST';
    const url = mine ? `/api/reviews/${mine.id}` : `/api/products/${productId}/reviews`;
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating, title, body }),
    });
    const json = await res.json();
    setMessage(res.ok ? 'Review saved' : json.error ?? 'Unable to save review');
    await load();
  }

  async function remove() {
    if (!mine) return;
    const res = await fetch(`/api/reviews/${mine.id}`, { method: 'DELETE' });
    const json = await res.json();
    setMessage(res.ok ? 'Review deleted' : json.error ?? 'Unable to delete review');
    await load();
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <h2 className="text-xl font-semibold text-slate-950 dark:text-white">{mine ? 'Edit your review' : 'Write a review'}</h2>
      <div className="mt-4 space-y-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full rounded-2xl border px-4 py-3" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share your experience" className="w-full rounded-2xl border px-4 py-3" rows={4} />
        <input type="number" min={1} max={5} value={rating} onChange={(e) => setRating(Number(e.target.value))} className="w-full rounded-2xl border px-4 py-3" />
        <div className="flex gap-3">
          <button onClick={submit} className="rounded-full bg-slate-950 px-4 py-2 text-white">{mine ? 'Update review' : 'Submit review'}</button>
          {mine ? <button onClick={remove} className="rounded-full border px-4 py-2">Delete review</button> : null}
        </div>
        {mine?.verifiedPurchase ? <div className="text-sm text-emerald-700">Verified purchase</div> : null}
        {message ? <div className="text-sm text-slate-500">{message}</div> : null}
      </div>
    </section>
  );
}
