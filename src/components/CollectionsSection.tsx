import { motion } from 'framer-motion';
import { Card } from './ui/Cards';
import { SectionHeading } from './ui/SectionHeading';

const collections = [
  { title: 'Coding Setup', description: 'Focused tools for software development.', image: '/images/collection-coding.jpg' },
  { title: 'Gaming Setup', description: 'Performance gear for immersive play.', image: '/images/collection-gaming.jpg' },
  { title: 'Student Setup', description: 'Affordable desks and accessories.', image: '/images/collection-student.jpg' },
  { title: 'Streaming Setup', description: 'Capture your best live content.', image: '/images/collection-streaming.jpg' },
  { title: 'Work From Home', description: 'Comfort and productivity combined.', image: '/images/collection-home.jpg' },
];

export default function CollectionsSection() {
  return (
    <section className="container mx-auto py-20">
      <SectionHeading title="Shop by collection" subtitle="Find the perfect setup for your workflow." />
      <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {collections.map((collection, index) => (
          <motion.div key={collection.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }}>
            <Card>
              <div className="overflow-hidden rounded-3xl">
                <img src={collection.image} alt={collection.title} className="h-56 w-full object-cover" />
              </div>
              <div className="p-6">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{collection.title}</p>
                <p className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{collection.description}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
