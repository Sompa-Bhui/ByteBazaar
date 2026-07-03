import Link from 'next/link';
import { Badge } from './ui/Badge';

export default function ProductBreadcrumbs({ categories, productTitle }: { categories: { name: string; slug: string }[]; productTitle: string }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-8 text-sm text-slate-500 dark:text-slate-400">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link href="/" className="transition hover:text-slate-700 dark:hover:text-white">
            Home
          </Link>
        </li>
        <li>/</li>
        {categories.length > 0 ? (
          <li className="flex items-center gap-2">
            <Link href={`/products?category=${categories[0].slug}`} className="transition hover:text-slate-700 dark:hover:text-white">
              {categories[0].name}
            </Link>
            <Badge className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">Category</Badge>
          </li>
        ) : null}
        <li>/</li>
        <li className="font-semibold text-slate-900 dark:text-white">{productTitle}</li>
      </ol>
    </nav>
  );
}
