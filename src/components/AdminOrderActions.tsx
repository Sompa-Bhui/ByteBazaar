"use client";

import { useState } from 'react';

export function AdminOrderActions({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function update(status: string) {
    if (!confirm(`Set order to ${status}?`)) return;
    setLoading(true);
    setMessage(null);
    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    setLoading(false);
    setMessage(res.ok ? 'Status updated' : json.error ?? 'Unable to update status');
    if (res.ok) window.location.reload();
  }

  const next = currentStatus === 'PENDING' ? ['PROCESSING', 'CANCELLED'] : currentStatus === 'PROCESSING' ? ['FULFILLED', 'CANCELLED'] : [];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {next.map((status) => (
          <button key={status} disabled={loading} onClick={() => update(status)} className="rounded-full border px-4 py-2 text-sm disabled:opacity-50">
            {status}
          </button>
        ))}
      </div>
      {message ? <div className="text-sm text-slate-600">{message}</div> : null}
    </div>
  );
}

