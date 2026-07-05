import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const products = await prisma.product.findMany({ take: 50, orderBy: { createdAt: 'desc' }, include: { brand: true, images: true, variants: true } });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Link href="/admin/products/create" className="px-3 py-2 bg-primary text-white rounded">Create Product</Link>
      </div>

      <div className="mt-6 bg-white border rounded">
        <table className="w-full table-fixed">
          <thead>
            <tr className="text-left">
              <th className="p-3">Title</th>
              <th className="p-3">SKU</th>
              <th className="p-3">Brand</th>
              <th className="p-3">Price</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">{p.title}</td>
                <td className="p-3">{p.sku ?? (p.variants[0]?.sku ?? '-')}</td>
                <td className="p-3">{p.brand?.name ?? '-'}</td>
                <td className="p-3">₹{(p.price / 100).toFixed(2)}</td>
                <td className="p-3">{p.isPublished ? 'Published' : 'Draft'}</td>
                <td className="p-3">
                  <Link href={`/admin/products/${p.id}/edit`} className="text-blue-600">Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
