export default function Loading() {
  return (
    <div className="container mx-auto py-16">
      <div className="space-y-8">
        <div className="h-8 w-64 animate-pulse rounded-full bg-slate-200/80 dark:bg-slate-800" />
        <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="h-[720px] animate-pulse rounded-[2rem] bg-slate-200/80 dark:bg-slate-800" />
          <div className="space-y-6">
            <div className="h-80 animate-pulse rounded-3xl bg-slate-200/80 dark:bg-slate-800" />
            <div className="h-64 animate-pulse rounded-3xl bg-slate-200/80 dark:bg-slate-800" />
          </div>
        </div>
      </div>
    </div>
  );
}
