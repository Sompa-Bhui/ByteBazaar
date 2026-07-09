'use client';

import { useState } from 'react';
import clsx from 'clsx';

export type TraceViewerStep = {
  id: string;
  label: string;
  detail?: string;
  kind?: 'accepted' | 'rejected' | 'root-cause' | 'final-decision' | 'neutral';
};

export type TraceViewerProps = {
  title: string;
  steps: TraceViewerStep[];
  emptyLabel?: string;
  className?: string;
};

export function TraceViewer({ title, steps, emptyLabel = 'No trace available.', className }: TraceViewerProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <section className={className} aria-label={title}>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-left dark:border-slate-800"
      >
        <span className="font-semibold text-slate-950 dark:text-white">{title}</span>
        <span className="text-sm text-slate-500 dark:text-slate-400">{expanded ? 'Collapse' : 'Expand'}</span>
      </button>
      {expanded ? (
        <div className="mt-3 space-y-2">
          {steps.length ? steps.map((step, index) => (
            <div key={step.id} className="rounded-2xl border border-slate-200 p-3 text-sm dark:border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <p className={clsx('font-medium', step.kind === 'root-cause' ? 'text-red-600 dark:text-red-400' : step.kind === 'accepted' ? 'text-emerald-600 dark:text-emerald-400' : step.kind === 'rejected' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-950 dark:text-white')}>
                  {index + 1}. {step.label}
                </p>
                {step.kind ? <span className="text-xs uppercase tracking-[0.24em] text-slate-400">{step.kind}</span> : null}
              </div>
              {step.detail ? <p className="mt-1 text-slate-500 dark:text-slate-400">{step.detail}</p> : null}
            </div>
          )) : <p className="text-sm text-slate-500 dark:text-slate-400">{emptyLabel}</p>}
        </div>
      ) : null}
    </section>
  );
}

