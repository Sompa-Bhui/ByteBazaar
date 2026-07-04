import { SectionHeading } from './ui/SectionHeading';
import { Badge } from './ui/Badge';
import type { StorefrontProductDetail } from '@/lib/storefront';

export default function ProductSpecifications({ product }: { product: StorefrontProductDetail }) {
  const sku = product.variants[0]?.sku ?? 'N/A';
  const availability = product.variants.some((variant) => (variant.inventory?.quantityOnHand ?? 0) > 0) ? 'In stock' : 'Out of stock';
  const categories = product.categories.map((category) => category.name).join(', ');

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <SectionHeading title="Specifications" subtitle="Everything you need to know before you buy." />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="space-y-3 rounded-3xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Brand</p>
          <p className="text-base font-semibold text-slate-900 dark:text-white">{product.brand?.name ?? 'ByteBazaar'}</p>
        </div>
        <div className="space-y-3 rounded-3xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Category</p>
          <p className="text-base font-semibold text-slate-900 dark:text-white">{categories || 'General'}</p>
        </div>
        <div className="space-y-3 rounded-3xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">SKU</p>
          <p className="text-base font-semibold text-slate-900 dark:text-white">{sku}</p>
        </div>
        <div className="space-y-3 rounded-3xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Availability</p>
          <Badge>{availability}</Badge>
        </div>
      </div>
      <div className="mt-8 overflow-hidden rounded-3xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-sm text-slate-600 dark:text-slate-300">
          <tbody>
            <tr className="border-t border-slate-200 dark:border-slate-800">
              <th className="py-4 text-left font-medium">Condition</th>
              <td className="py-4">New</td>
            </tr>
            <tr className="border-t border-slate-200 dark:border-slate-800">
              <th className="py-4 text-left font-medium">Warranty</th>
              <td className="py-4">1 Year Manufacturer</td>
            </tr>
            <tr className="border-t border-slate-200 dark:border-slate-800">
              <th className="py-4 text-left font-medium">Shipping</th>
              <td className="py-4">Free standard delivery</td>
            </tr>
            <tr className="border-t border-slate-200 dark:border-slate-800">
              <th className="py-4 text-left font-medium">Model</th>
              <td className="py-4">{product.title}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
