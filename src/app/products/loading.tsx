export default function Loading() {
  return (
    <div className="container mx-auto py-16">
      <div className="grid gap-8 xl:grid-cols-[280px_1fr]">
        <div className="h-96 animate-pulse rounded-3xl bg-slate-200/80 dark:bg-slate-800" />
        <div className="space-y-6">
          <div className="h-28 animate-pulse rounded-3xl bg-slate-200/80 dark:bg-slate-800" />
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            <div className="h-96 animate-pulse rounded-3xl bg-slate-200/80 dark:bg-slate-800" />
            <div className="h-96 animate-pulse rounded-3xl bg-slate-200/80 dark:bg-slate-800" />
            <div className="h-96 animate-pulse rounded-3xl bg-slate-200/80 dark:bg-slate-800" />
          </div>
        </div>
      </div>
    </div>
  );
}
