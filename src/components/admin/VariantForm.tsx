"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import ImageUploader from './ImageUploader';

const schema = z.object({
  title: z.string().min(1),
  price: z.number().min(0),
  sku: z.string().optional(),
  attributes: z.string().optional(), // JSON string
  images: z.array(z.string()).optional(),
  inventory: z.object({ quantityOnHand: z.number().int().min(0).optional(), safetyStock: z.number().int().min(0).optional(), location: z.string().optional() }).optional(),
});

type FormValues = z.infer<typeof schema>;

export default function VariantForm({ productId, variantId, initial }: { productId: string; variantId?: string; initial?: Partial<FormValues> }) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: initial as Partial<FormValues> });
  const [loading, setLoading] = useState(false);

  async function onSubmit(data: FormValues) {
    setLoading(true);
    try {
      // parse numbers
      const payload = { ...data, price: Math.round(data.price) };
      const url = variantId ? `/api/admin/products/${productId}/variants/${variantId}` : `/api/admin/products/${productId}/variants/create`;
      const method = variantId ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      window.location.href = `/admin/products/${productId}/variants`;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(msg || 'Save failed');
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block">Title</label>
        <input {...register('title')} className="w-full border p-2 rounded" />
        {errors.title && <div className="text-red-600">{String(errors.title.message)}</div>}
      </div>

      <div>
        <label className="block">Price (cents)</label>
        <input type="number" {...register('price', { valueAsNumber: true })} className="w-full border p-2 rounded" />
        {errors.price && <div className="text-red-600">{String(errors.price.message)}</div>}
      </div>

      <div>
        <label className="block">SKU (optional)</label>
        <input {...register('sku')} className="w-full border p-2 rounded" />
      </div>

      <div>
        <label className="block">Attributes (JSON)</label>
        <textarea {...register('attributes')} className="w-full border p-2 rounded" rows={3} />
      </div>

      <div>
        <label className="block">Initial Stock</label>
        <input type="number" {...register('inventory.quantityOnHand', { valueAsNumber: true })} className="w-full border p-2 rounded" />
      </div>

      <div>
        <label className="block">Safety Stock</label>
        <input type="number" {...register('inventory.safetyStock', { valueAsNumber: true })} className="w-full border p-2 rounded" />
      </div>

      <div>
        <button type="submit" className="px-3 py-2 bg-primary text-white rounded" disabled={loading}>{loading ? 'Saving...' : 'Save Variant'}</button>
      </div>
      <div>
        <label className="block">Images</label>
        <ImageUploader productId={productId} variantId={variantId} />
      </div>
    </form>
  );
}
