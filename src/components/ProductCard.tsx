import Link from 'next/link';
import { Badge } from './ui/Badge';
import { Card, CardBody } from './ui/Cards';
import { Button } from './ui/Button';

export type ProductCardData = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  price: number;
  badge?: string;
  image: string;
  rating: number;
};

export function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <Card className="group">
      <Link href={`/products/${product.slug}`} className="block overflow-hidden rounded-3xl bg-slate-100">
        <img
          src={product.image}
          alt={product.title}
          className="h-72 w-full object-cover"
        />
      </Link>
      <CardBody>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{product.subtitle}</p>
            <h3 className="mt-3 text-xl font-semibold text-slate-950 dark:text-white">{product.title}</h3>
          </div>
          {product.badge ? <Badge>{product.badge}</Badge> : null}
        </div>
        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-2xl font-semibold text-slate-950 dark:text-white">₹{(product.price / 100).toFixed(2)}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{product.rating.toFixed(1)} ★</p>
          </div>
          <Button as="a" href={`/products/${product.slug}`} variant="secondary" size="sm">
            View
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
