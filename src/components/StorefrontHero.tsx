import { Button } from './ui/Button';

const bullets = [
  'Developer-first workspace gear',
  'Curated hardware and setup bundles',
  'Fast delivery for modern builders',
];

const categories = [
  { label: 'Workstations', href: '/products?category=workstations' },
  { label: 'Displays', href: '/products?category=displays' },
  { label: 'Inputs', href: '/products?category=inputs' },
];

export default function StorefrontHero() {
  return (
    <section className="overflow-hidden bg-slate-950 text-white">
      <div className="container mx-auto grid gap-8 py-14 lg:grid-cols-[1.12fr_0.88fr] lg:items-center lg:py-16">
        <div className="space-y-6">
          <p className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-200">
            Curated setups
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Build a sharper workspace with premium tech gear and expert picks.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            ByteBazaar is an intelligent marketplace for developer gear and personalized tech setups.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button as="a" href="/build-lab" size="lg">
              Open Build Lab
            </Button>
            <Button as="a" href="/build-lab" variant="secondary" size="lg">
              Try a demo scenario
            </Button>
            <Button
              as="a"
              href="/products"
              variant="ghost"
              size="lg"
              className="border border-white/20 bg-white/5 text-white/90 shadow-sm hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Browse developer gear
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {categories.map((category) => (
              <Button key={category.label} as="a" href={category.href} variant="ghost" size="sm" className="border border-white/30 bg-white/15 text-white shadow-sm hover:bg-white/20">
                {category.label}
              </Button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {bullets.map((item, index) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[0.68rem] uppercase tracking-[0.28em] text-slate-400">{`0${index + 1}`}</p>
                <p className="mt-2 text-sm font-medium text-white">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900 p-4 shadow-2xl shadow-slate-950/40 lg:p-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(96,165,250,0.22),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(236,72,153,0.16),_transparent_28%)]" />
          <div className="relative grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/90 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Featured bundle</p>
              <p className="mt-3 text-lg font-semibold text-white">Constraint-Aware Build Lab</p>
              <p className="mt-2 text-sm text-slate-300">Curated gear bundles tailored for focus, comfort, and speed.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/90 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Starting at</p>
              <p className="mt-3 text-2xl font-semibold text-white">₹64,999</p>
              <p className="mt-2 text-sm text-slate-300">Built for every level of developer setup upgrade.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Marketplace highlights</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <MiniStat value="4.9" label="Rating" />
                <MiniStat value="120+" label="Bundles" />
                <MiniStat value="24h" label="Support" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-slate-950/70 p-4 text-center">
      <p className="text-3xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-[0.7rem] uppercase tracking-[0.26em] text-slate-500">{label}</p>
    </div>
  );
}


