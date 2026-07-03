"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import ImageUploader from './ImageUploader';

const ProductSchema = z.object({
  title: z.string().min(2),
  slug: z.string().min(2),
  shortDesc: z.string().optional(),
  description: z.string().optional(),
  price: z.number().min(0),
  brandId: z.string().optional(),
  isPublished: z.boolean().optional()
});

type ProductFormValues = z.infer<typeof ProductSchema>;

export default function ProductForm({ initial, productId }: { initial?: Partial<ProductFormValues>; productId?: string } = {}) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<ProductFormValues>({ resolver: zodResolver(ProductSchema), defaultValues: initial });

  async function onSubmit(data: ProductFormValues) {
    setLoading(true);
    try {
      const url = productId ? `/api/admin/products/${productId}` : '/api/admin/products/create';
      const method = productId ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      window.location.href = `/admin/products`;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(msg || 'Save failed');
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block">Name</label>
        <input {...register('title')} className="w-full border p-2 rounded" />
        {errors.title && <div className="text-red-600">{errors.title.message}</div>}
      </div>

      <div>
        <label className="block">Slug</label>
        <input {...register('slug')} className="w-full border p-2 rounded" />
      </div>

      <div>
        <label className="block">Short Description</label>
        <textarea {...register('shortDesc')} className="w-full border p-2 rounded" />
      </div>

      <div>
        <label className="block">Price (in cents)</label>
        <input type="number" {...register('price', { valueAsNumber: true })} className="w-full border p-2 rounded" />
      </div>

      <div>
        <label className="block">Brand ID</label>
        <input {...register('brandId')} className="w-full border p-2 rounded" />
      </div>

      <div>
        <label className="block">Images</label>
        {productId ? <ImageUploader productId={productId} /> : <div className="text-sm text-gray-600">Save product to manage images</div>}
      </div>

      <div>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" {...register('isPublished')} /> Published
        </label>
      </div>

      <div>
        <button className="px-4 py-2 bg-primary text-white rounded" disabled={loading}>{loading ? 'Saving...' : 'Save product'}</button>
      </div>
    </form>
  );
}
