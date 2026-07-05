"use client";

import { useState } from 'react';

export function ProductReviewForm({ productId }: { productId: string }) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    setMessage(null);
    const res = await fetch(`/api/products/${productId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating, title, body }),
    });
    const json = await res.json();
    setMessage(res.ok ? 'Review submitted' : json.error ?? 'Unable to submit review');
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Write a review</h2>
      <div className="mt-4 space-y-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full rounded-2xl border px-4 py-3" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share your experience" className="w-full rounded-2xl border px-4 py-3" rows={4} />
        <input type="number" min={1} max={5} value={rating} onChange={(e) => setRating(Number(e.target.value))} className="w-full rounded-2xl border px-4 py-3" />
        <button onClick={submit} className="rounded-full bg-slate-950 px-4 py-2 text-white">Submit review</button>
        {message ? <div className="text-sm text-slate-500">{message}</div> : null}
      </div>
    </section>
  );
}

