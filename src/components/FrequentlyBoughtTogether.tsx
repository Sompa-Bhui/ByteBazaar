import { ProductGrid } from './ProductGrid';
import { SectionHeading } from './ui/SectionHeading';
import type { StorefrontRelatedProduct } from '@/lib/storefront';

export default function FrequentlyBoughtTogether({ products }: { products: StorefrontRelatedProduct[] }) {
  if (products.length === 0) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <SectionHeading title="Frequently bought together" subtitle="Complementary products often purchased with this item." />
        <div className="mt-8 text-sm text-slate-500 dark:text-slate-400">No frequently bought together products found.</div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <SectionHeading title="Frequently bought together" subtitle="People who bought this item also bought:" />
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
