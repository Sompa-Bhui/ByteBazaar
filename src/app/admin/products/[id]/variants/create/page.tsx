import VariantForm from '@/components/admin/VariantForm';

export default async function CreateVariantPage({ params }: { params: { id: string } }) {
  const productId = params.id;
  return (
    <div>
      <h1 className="text-2xl font-semibold">Add Variant</h1>
      <div className="mt-6">
        <VariantForm productId={productId} />
      </div>
    </div>
  );
}
