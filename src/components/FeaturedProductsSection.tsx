import { ProductGrid } from './ProductGrid';
import type { ProductCardData } from './ProductCard';
import { SectionHeading } from './ui/SectionHeading';

const featuredProducts: ProductCardData[] = [
  { id: 'setup-1', slug: 'byteview-34-ultrawide', title: 'ByteView 34 UltraWide', subtitle: 'Display', price: 3999900, badge: 'Bestseller', rating: 4.9, image: '/featured-products/byteview-ultrawide.svg', techSignal: '4K 144Hz' },
  { id: 'bundle-1', slug: 'byteforge-developer-workspace-kit', title: 'ByteForge Developer Workspace Kit', subtitle: 'Workspace', price: 11999900, badge: 'Build Lab ready', rating: 4.8, image: '/featured-products/byteforge-workspace-kit.svg', techSignal: 'Build Lab ready' },
  { id: 'dock-1', slug: 'bytedock-12-in-1', title: 'ByteDock 12-in-1', subtitle: 'Connectivity', price: 1499900, badge: 'Top Rated', rating: 4.7, image: '/featured-products/bytedock-12-in-1.svg', techSignal: '140W PD' },
];

export default function FeaturedProductsSection() {
  return (
    <section className="container mx-auto py-12 sm:py-14">
      <SectionHeading title="Featured products" subtitle="Premier picks for developer workspaces and deterministic build planning." />
      <div className="mt-8">
        <ProductGrid products={featuredProducts} />
      </div>
    </section>
  );
}
