'use client';

import clsx from 'clsx';
import type { BuildSnapshotSummary, AppliedTransactionResult } from '@/lib/build-lab/transactions';
import { formatINR } from '@/lib/format';

export type ProofPanelProps = {
  title: string;
  before: BuildSnapshotSummary;
  after: BuildSnapshotSummary;
  delta: Pick<AppliedTransactionResult, 'healthDelta' | 'priceDeltaINR' | 'actualResolvedConflictIds' | 'actualIntroducedConflictIds'> & {
    devicesAdded: string[];
    devicesRemoved: string[];
  };
  className?: string;
};

export function ProofPanel({ title, before, after, delta, className }: ProofPanelProps) {
  return (
    <section className={clsx('rounded-3xl border border-slate-200 p-4 dark:border-slate-800', className)} aria-label={title}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{title}</h3>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <SummaryBlock label="Before" summary={before} />
        <SummaryBlock label="After" summary={after} />
        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
          <p className="text-[0.65rem] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Delta</p>
          <dl className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-300">
            <Row label="Health delta" value={delta.healthDelta} />
            <Row label="Price delta" value={formatINR(delta.priceDeltaINR)} />
            <Row label="Resolved" value={delta.actualResolvedConflictIds.length} />
            <Row label="Introduced" value={delta.actualIntroducedConflictIds.length} />
            <Row label="Added devices" value={delta.devicesAdded.length} />
            <Row label="Removed devices" value={delta.devicesRemoved.length} />
          </dl>
        </div>
      </div>
    </section>
  );
}

function SummaryBlock({ label, summary }: { label: string; summary: BuildSnapshotSummary }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
      <p className="text-[0.65rem] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{label}</p>
      <dl className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-300">
        <Row label="Health" value={summary.health} />
        <Row label="Price" value={formatINR(summary.totalCostINR)} />
        <Row label="Hard violations" value={summary.hardViolations} />
        <Row label="Warnings" value={summary.warnings} />
        <Row label="Conflicts" value={summary.conflicts.length} />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-950 dark:text-white">{value}</dd>
    </div>
  );
}

