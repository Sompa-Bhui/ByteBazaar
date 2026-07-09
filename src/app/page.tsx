import StorefrontHero from '@/components/StorefrontHero';
import FeaturedProductsSection from '@/components/FeaturedProductsSection';
import TrendingProductsSection from '@/components/TrendingProductsSection';
import Link from 'next/link';

export default function Home() {
  return (
    <>
      <StorefrontHero />
      <section className="container mx-auto mt-4 px-4 sm:mt-6">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Why ByteBazaar is different</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-center">
            <PipelineStep label="Normal marketplace" value="Search → Buy" />
            <Arrow />
            <PipelineStep label="ByteBazaar" value="Describe constraints" emphasis />
            <Arrow />
            <PipelineStep label="Build" value="Build graph" />
            <Arrow />
            <PipelineStep label="Analyze" value="Detect conflicts" />
            <Arrow />
            <PipelineStep label="Simulate" value="Simulate future" />
            <Arrow />
            <PipelineStep label="Verify" value="Verify fix" />
            <Arrow />
            <PipelineStep label="Outcome" value="Buy" />
          </div>
          <div className="mt-5">
            <Link href="/build-lab" className="inline-flex items-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">Open Build Lab</Link>
          </div>
        </div>
      </section>
      <FeaturedProductsSection />
      <TrendingProductsSection />
    </>
  );
}

function PipelineStep({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className={emphasis ? 'rounded-2xl bg-slate-950 p-3 text-center text-white dark:bg-white dark:text-slate-950' : 'rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-900'}>
      <p className={emphasis ? 'text-[0.65rem] uppercase tracking-[0.24em] text-slate-300 dark:text-slate-500' : 'text-[0.65rem] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400'}>{label}</p>
      <p className={emphasis ? 'mt-1 text-sm font-semibold text-white dark:text-slate-950' : 'mt-1 text-sm font-semibold text-slate-950 dark:text-white'}>{value}</p>
    </div>
  );
}

function Arrow() {
  return <div className="hidden text-center text-slate-400 md:block">→</div>;
}


