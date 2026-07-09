import { motion } from 'framer-motion';
import { Card } from './ui/Cards';
import { SectionHeading } from './ui/SectionHeading';
import { MarketplaceImage } from './MarketplaceImage';

const collections = [
  { title: 'Constraint-Aware Build Lab', description: 'A focused setup for coding and shipping faster.', image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80' },
  { title: 'Monitor & Vision', description: 'Ultrawide displays and visual clarity tools.', image: 'https://images.unsplash.com/photo-1527443224154-c4be6f0d1c19?auto=format&fit=crop&w=1200&q=80' },
  { title: 'Input Lab', description: 'Keyboards, mice, and interaction accessories.', image: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&w=1200&q=80' },
  { title: 'Audio Studio', description: 'Headsets, speakers, and microphone gear.', image: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=1200&q=80' },
  { title: 'Creator Desk', description: 'Lighting, webcams, and creator essentials.', image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80' },
];

export default function CollectionsSection() {
  return (
    <section className="container mx-auto py-12 sm:py-14">
      <SectionHeading title="Shop by collection" subtitle="Find the perfect developer setup for your workflow." />
      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {collections.map((collection, index) => (
          <motion.div key={collection.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
            <Card className="overflow-hidden">
              <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                <MarketplaceImage src={collection.image} alt={collection.title} fill className="object-cover transition duration-500 hover:scale-[1.03]" sizes="(max-width: 768px) 100vw, 33vw" />
              </div>
              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{collection.title}</p>
                <p className="mt-3 text-base font-semibold text-slate-950 dark:text-white">{collection.description}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
