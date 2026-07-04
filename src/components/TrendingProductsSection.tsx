import { ProductGrid } from './ProductGrid';
import type { ProductCardData } from './ProductCard';
import { SectionHeading } from './ui/SectionHeading';

const trendingProducts: ProductCardData[] = [
  { id: 'keyboard-1', slug: 'nimbus-keyboard', title: 'Nimbus Keyboard', subtitle: 'Accessories', price: 12499, badge: 'Trending', rating: 4.8, image: '/images/keyboard-1.jpg' },
  { id: 'speaker-1', slug: 'aero-soundbar', title: 'Aero Soundbar', subtitle: 'Audio', price: 21999, badge: 'Hot', rating: 4.7, image: '/images/speaker-1.jpg' },
  { id: 'desk-lamp', slug: 'halo-desk-lamp', title: 'Halo Desk Lamp', subtitle: 'Lighting', price: 5999, badge: 'Editor’s Pick', rating: 4.6, image: '/images/lamp-1.jpg' },
];

export default function TrendingProductsSection() {
  return (
    <section className="container mx-auto py-20">
      <SectionHeading title="Trending now" subtitle="What developers are adding to their desk setups." />
      <div className="mt-12">
        <ProductGrid products={trendingProducts} />
      </div>
    </section>
  );
}
