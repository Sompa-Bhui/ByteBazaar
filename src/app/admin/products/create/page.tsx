"use client";

import React from 'react';
import ProductForm from '@/components/admin/ProductForm';

export default function CreateProductPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Create Product</h1>
      <div className="mt-6">
        <ProductForm />
      </div>
    </div>
  );
}
