import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
  const variants = (await prisma.productVariant.findMany({ include: { product: true, inventory: true }, orderBy: { updatedAt: 'desc' }, take: 200 })) as Array<{
    id: string;
    title: string;
    sku: string | null;
    product: { title: string };
    inventory: { quantityOnHand: number; safetyStock: number; location: string | null } | null;
  }>;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Inventory</h1>
      <div className="mt-6 bg-white border rounded">
        <table className="w-full">
          <thead>
            <tr>
              <th className="p-3">Variant</th>
              <th className="p-3">SKU</th>
              <th className="p-3">On Hand</th>
              <th className="p-3">Safety Stock</th>
              <th className="p-3">Location</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => (
              <tr key={v.id} className="border-t">
                <td className="p-3">{v.product.title} — {v.title}</td>
                <td className="p-3">{v.sku}</td>
                <td className="p-3">{v.inventory?.quantityOnHand ?? 0}</td>
                <td className="p-3">{v.inventory?.safetyStock ?? 0}</td>
                <td className="p-3">{v.inventory?.location ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
