import { ProductGrid, ProductCardData } from './ProductGrid';
import { SectionHeading } from './ui/SectionHeading';

const featuredProducts: ProductCardData[] = [
  { id: 'desk-1', slug: 'vertex-desk-kit', title: 'Vertex Desk Kit', subtitle: 'Workstation', price: 124999, badge: 'Bestseller', rating: 4.9, image: '/images/desk-1.jpg' },
  { id: 'monitor-1', slug: 'luma-ultrawide', title: 'Luma UltraWide', subtitle: 'Display', price: 84999, badge: 'New', rating: 4.8, image: '/images/monitor-1.jpg' },
  { id: 'chair-1', slug: 'aeris-mesh-chair', title: 'Aeris Mesh Chair', subtitle: 'Ergonomic', price: 44999, badge: 'Top Rated', rating: 4.7, image: '/images/chair-1.jpg' },
];

export default function FeaturedProductsSection() {
  return (
    <section className="container mx-auto py-20">
      <SectionHeading title="Featured products" subtitle="Premier picks for modern workspaces." />
      <div className="mt-12">
        <ProductGrid products={featuredProducts} />
      </div>
    </section>
  );
}
