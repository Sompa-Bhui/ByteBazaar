import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function VariantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: productId } = await params;
  const variants = await prisma.productVariant.findMany({ where: { productId }, include: { inventory: true }, orderBy: { createdAt: 'desc' } });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Variants</h1>
        <Link href={`/admin/products/${productId}/variants/create`} className="px-3 py-2 bg-primary text-white rounded">Add Variant</Link>
      </div>

      <div className="mt-6 bg-white border rounded">
        <table className="w-full">
          <thead>
            <tr>
              <th className="p-3">Title</th>
              <th className="p-3">SKU</th>
              <th className="p-3">Price</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => {
              const qty = v.inventory?.quantityOnHand ?? 0;
              const safety = v.inventory?.safetyStock ?? 0;
              const status = qty <= 0 ? 'Out of Stock' : qty <= safety ? 'Low Stock' : 'In Stock';
              return (
                <tr key={v.id} className="border-t">
                  <td className="p-3">{v.title}</td>
                  <td className="p-3">{v.sku}</td>
                  <td className="p-3">{(v.price / 100).toFixed(2)}</td>
                  <td className="p-3">{qty}</td>
                  <td className="p-3"><span className={`px-2 py-1 rounded ${status==='Out of Stock' ? 'bg-red-100 text-red-800' : status==='Low Stock' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{status}</span></td>
                  <td className="p-3"><Link href={`/admin/products/${productId}/variants/${v.id}`} className="text-blue-600">Edit</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
