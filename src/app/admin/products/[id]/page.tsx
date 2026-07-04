import ProductForm from '@/components/admin/ProductForm';
import { prisma } from '@/lib/prisma';

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id }, include: { variants: true, images: true } });
  if (!product) return <div>Not found</div>;

  const initial = {
    title: product.title,
    slug: product.slug,
    shortDesc: product.shortDesc ?? undefined,
    description: product.description ?? undefined,
    price: product.price,
    brandId: product.brandId ?? undefined,
    isPublished: product.isPublished
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold">Edit Product</h1>
      <div className="mt-6">
        {/* ProductForm will POST to create; editing via separate API could be implemented later */}
        <ProductForm initial={initial} />
      </div>
    </div>
  );
}
