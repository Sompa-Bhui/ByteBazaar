import Link from 'next/link';
import { Badge } from './ui/Badge';

export type ProductListItem = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  price: number;
  rating: number;
  image: string;
  availability: string;
};

export function ProductList({ products }: { products: ProductListItem[] }) {
  if (products.length === 0) {
    return <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">No products available yet.</div>;
  }

  return (
    <div className="space-y-6">
      {products.map((product) => (
        <article key={product.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950">
          <div className="grid gap-6 md:grid-cols-[280px_1fr]">
            <div className="relative h-72 overflow-hidden bg-slate-100">
              <img src={product.image} alt={product.title} className="h-full w-full object-cover" />
            </div>
            <div className="p-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{product.subtitle}</span>
                <Badge>{product.availability}</Badge>
              </div>
              <Link href={`/products/${product.slug}`} className="mt-4 block text-2xl font-semibold text-slate-950 hover:text-slate-700 dark:text-white dark:hover:text-slate-200">
                {product.title}
              </Link>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-400">{product.description}</p>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-2xl font-semibold text-slate-950 dark:text-white">₹{(product.price / 100).toFixed(2)}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{product.rating.toFixed(1)} ★ rating</p>
                </div>
                <Link href={`/products/${product.slug}`} className="inline-flex items-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100">
                  View product
                </Link>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
