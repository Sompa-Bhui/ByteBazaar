import clsx from 'clsx';

export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={clsx('inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200', className)}>{children}</span>;
}
