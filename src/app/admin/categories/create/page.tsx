"use client";
import React, { useState } from 'react';

export default function CreateCategory() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/categories', { method: 'POST', body: JSON.stringify({ name, slug }), headers: { 'Content-Type': 'application/json' } });
    if (res.ok) window.location.href = '/admin/categories';
    else alert('Failed');
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div>
        <label className="block">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border p-2 rounded" />
      </div>
      <div>
        <label className="block">Slug</label>
        <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full border p-2 rounded" />
      </div>
      <div>
        <button className="px-3 py-2 bg-primary text-white rounded">Create</button>
      </div>
    </form>
  );
}
