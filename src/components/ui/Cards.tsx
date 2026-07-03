import { ReactNode } from 'react';
import clsx from 'clsx';

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={clsx('overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950', className)}>
      {children}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx('p-6', className)}>{children}</div>;
}
