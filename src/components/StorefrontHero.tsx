import { motion } from 'framer-motion';
import { Button } from './ui/Button';

const bullets = [
  'Premium developer workspaces',
  'Curated hardware + software bundles',
  'Fast delivery for modern professionals',
];

export default function StorefrontHero() {
  return (
    <section className="overflow-hidden bg-slate-950 text-white">
      <div className="container mx-auto grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center py-20">
        <div className="space-y-8">
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm uppercase tracking-[0.3em] text-slate-200">
            Curated setups
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="max-w-3xl text-5xl font-semibold tracking-tight sm:text-6xl">
            Build your dream workspace with premium products and expert setups.
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="max-w-2xl text-lg leading-8 text-slate-300">
            Discover modern desks, monitors, speakers, and accessories designed for performance, comfort, and style.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="flex flex-wrap items-center gap-4">
            <Button as="a" href="/products" size="lg">
              Shop premium setups
            </Button>
            <Button as="a" href="/collections" variant="ghost" size="lg">
              Browse collections
            </Button>
          </motion.div>
          <div className="grid gap-4 sm:grid-cols-3">
            {bullets.map((item, index) => (
              <motion.div key={item} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + index * 0.05 }} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{`0${index + 1}`}</p>
                <p className="mt-3 text-base font-semibold text-white">{item}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-6 shadow-2xl shadow-slate-900/30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(96,165,250,0.2),_transparent_33%),_radial-gradient(circle_at_bottom_left,_rgba(236,72,153,0.16),_transparent_28%)]" />
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="relative rounded-[2rem] border border-white/10 bg-slate-950 p-8">
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-slate-900 p-5">
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Featured Bundle</p>
                  <p className="mt-4 text-xl font-semibold text-white">Desk Power Setup</p>
                </div>
                <div className="rounded-3xl bg-slate-900 p-5">
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Starting at</p>
                  <p className="mt-4 text-xl font-semibold text-white">₹64,999</p>
                </div>
              </div>
              <div className="rounded-3xl border border-white/10 p-5 text-slate-300">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Latest drop</p>
                <p className="mt-2 text-lg font-semibold">UltraWide Studio Monitor</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl bg-slate-800 p-4 text-center">
                  <p className="text-4xl font-semibold text-white">4.9</p>
                  <p className="mt-2 text-sm uppercase tracking-[0.25em] text-slate-500">Rating</p>
                </div>
                <div className="rounded-3xl bg-slate-800 p-4 text-center">
                  <p className="text-4xl font-semibold text-white">120+</p>
                  <p className="mt-2 text-sm uppercase tracking-[0.25em] text-slate-500">Bundles</p>
                </div>
                <div className="rounded-3xl bg-slate-800 p-4 text-center">
                  <p className="text-4xl font-semibold text-white">24h</p>
                  <p className="mt-2 text-sm uppercase tracking-[0.25em] text-slate-500">Support</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
