import VariantForm from '@/components/admin/VariantForm';
import { prisma } from '@/lib/prisma';

export const revalidate = 0;

export default async function EditVariantPage({ params }: { params: Promise<{ id: string; variantId: string }> }) {
  const { id: productId, variantId } = await params;
  const variant = await prisma.productVariant.findUnique({ where: { id: variantId }, include: { inventory: true } });
  if (!variant) return <div>Not found</div>;

  const initial = {
    title: variant.title,
    price: variant.price,
    sku: variant.sku ?? undefined,
    attributes: variant.attributes ? JSON.stringify(variant.attributes) : undefined,
    inventory: variant.inventory ? { quantityOnHand: variant.inventory.quantityOnHand, safetyStock: variant.inventory.safetyStock, location: variant.inventory.location ?? undefined } : undefined,
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold">Edit Variant</h1>
      <div className="mt-6">
        <VariantForm productId={productId} variantId={variantId} initial={initial} />
      </div>
    </div>
  );
}
