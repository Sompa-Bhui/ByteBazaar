"use client";

import { useEffect, useState } from 'react';

export type Address = {
  id: string;
  label: string | null;
  isDefault: boolean;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
};

type Props = {
  selectedAddressId: string | null;
  onSelect: (id: string) => void;
  onChanged?: () => void;
};

const emptyForm = { label: '', fullName: '', phone: '', line1: '', line2: '', city: '', state: '', postalCode: '', country: 'India', isDefault: false };

export function AddressManager({ selectedAddressId, onSelect, onChanged }: Props) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/addresses');
    const data = await res.json();
    setAddresses(data.data ?? []);
    setLoading(false);
  }

  useEffect(() => { load().catch(() => setLoading(false)); }, []);

  async function save() {
    setError(null);
    const res = await fetch('/api/addresses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      ...form, label: form.label || null, line2: form.line2 || null, state: form.state || null,
    }) });
    const data = await res.json();
    if (!res.ok) return setError(data.error ?? 'Unable to save address');
    setForm(emptyForm);
    await load();
    onChanged?.();
  }

  async function remove(id: string) {
    if (!confirm('Delete this address?')) return;
    const res = await fetch(`/api/addresses/${id}`, { method: 'DELETE' });
    if (res.ok) { await load(); onChanged?.(); }
  }

  if (loading) return <div className="rounded-3xl border border-slate-200 bg-white p-6">Loading addresses...</div>;

  return <div className="space-y-6">
    <div className="grid gap-3 md:grid-cols-2">
      <input placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="rounded-2xl border p-3" />
      <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-2xl border p-3" />
      <input placeholder="Address line 1" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} className="rounded-2xl border p-3 md:col-span-2" />
      <input placeholder="Address line 2" value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} className="rounded-2xl border p-3 md:col-span-2" />
      <input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="rounded-2xl border p-3" />
      <input placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="rounded-2xl border p-3" />
      <input placeholder="Postal code" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} className="rounded-2xl border p-3" />
      <input placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="rounded-2xl border p-3" />
      <label className="flex items-center gap-2 md:col-span-2"><input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} /> Default address</label>
      <button onClick={save} className="rounded-full bg-slate-950 px-4 py-2 text-white md:col-span-2">Add address</button>
      {error ? <div className="text-sm text-rose-600 md:col-span-2">{error}</div> : null}
    </div>
    <div className="space-y-3">
      {addresses.length ? addresses.map((a) => <div key={a.id} className="rounded-3xl border p-4">
        <label className="flex items-start gap-3">
          <input type="radio" name="ship" checked={selectedAddressId === a.id} onChange={() => onSelect(a.id)} />
          <div className="flex-1">
            <div className="font-medium">{a.fullName} {a.isDefault ? '(Default)' : ''}</div>
            <div className="text-sm text-slate-500">{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state ?? ''} {a.postalCode}, {a.country}</div>
          </div>
        </label>
        <button onClick={() => remove(a.id)} className="mt-2 text-sm text-rose-600">Delete</button>
      </div>) : <div className="rounded-3xl border border-dashed p-6 text-sm text-slate-500">No saved addresses yet.</div>}
    </div>
  </div>;
}

