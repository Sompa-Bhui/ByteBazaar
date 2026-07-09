import { ProductGrid } from './ProductGrid';
import type { ProductCardData } from './ProductCard';
import { SectionHeading } from './ui/SectionHeading';

const trendingProducts: ProductCardData[] = [
  { id: 'keyboard-1', slug: 'bytekeys-pro-75', title: 'ByteKeys Pro 75', subtitle: 'Inputs', price: 1299900, badge: 'Trending', rating: 4.8, image: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&w=1200&q=80', techSignal: '75% Mechanical' },
  { id: 'mouse-1', slug: 'bytemouse-ergo-x', title: 'ByteMouse Ergo X', subtitle: 'Inputs', price: 899900, badge: 'Hot', rating: 4.7, image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=1200&q=80', techSignal: 'macOS + Windows' },
  { id: 'light-1', slug: 'bytelight-monitor-bar', title: 'ByteLight Monitor Bar', subtitle: 'Lighting', price: 799900, badge: "Editor's Pick", rating: 4.6, image: '/trending-products/bytelight-monitor-bar.svg', techSignal: 'USB-C Powered' },
];

export default function TrendingProductsSection() {
  return (
    <section className="container mx-auto py-12 sm:py-14">
      <SectionHeading title="Trending now" subtitle="What developers are adding to their desk and build environments." />
      <div className="mt-8">
        <ProductGrid products={trendingProducts} />
      </div>
    </section>
  );
}
