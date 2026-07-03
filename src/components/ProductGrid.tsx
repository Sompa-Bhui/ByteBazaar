import { motion } from 'framer-motion';
import { ProductCard, ProductCardData } from './ProductCard';

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  return (
    <motion.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: {} }} className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product, index) => (
        <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
          <ProductCard product={product} />
        </motion.div>
      ))}
    </motion.div>
  );
}
