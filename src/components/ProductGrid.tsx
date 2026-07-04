import { ProductCard, ProductCardData } from './ProductCard';

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => (
        <div key={product.id}>
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  );
}
