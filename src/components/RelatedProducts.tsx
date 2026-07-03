import { ProductGrid, ProductCardData } from './ProductGrid';
import { SectionHeading } from './ui/SectionHeading';
import type { StorefrontRelatedProduct } from '@/lib/storefront';

export default function RelatedProducts({ products }: { products: StorefrontRelatedProduct[] }) {
  if (products.length === 0) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <SectionHeading title="Related products" subtitle="More items from similar brands and categories." />
        <div className="mt-8 text-sm text-slate-500 dark:text-slate-400">No related products available yet.</div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <SectionHeading title="Related products" subtitle="Customers also viewed these items." />
      <div className="mt-8">
        <ProductGrid products={products.map((product) => ({
          id: product.id,
          slug: product.slug,
          title: product.title,
          subtitle: product.brand,
          price: product.price,
          image: product.image,
          rating: 4.6,
        }))} />
      </div>
    </section>
  );
}
