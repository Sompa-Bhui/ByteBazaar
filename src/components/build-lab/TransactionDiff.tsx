'use client';

import type { BuildTransaction, TransactionOperation } from '@/lib/build-lab/transactions';
import { buildLabDevices } from '@/lib/build-lab/data';

export type TransactionDiffProps = {
  transaction: BuildTransaction | null;
  className?: string;
};

export function TransactionDiff({ transaction, className }: TransactionDiffProps) {
  if (!transaction || !transaction.operations.length) {
    return (
      <section className={className} aria-label="Transaction diff">
        <p className="text-sm text-slate-500 dark:text-slate-400">No changes to show.</p>
      </section>
    );
  }

  return (
    <section className={className} aria-label="Transaction diff">
      <div className="space-y-2">
        {transaction.operations.map((operation) => (
          <OperationRow key={operation.id} operation={operation} />
        ))}
      </div>
    </section>
  );
}

function OperationRow({ operation }: { operation: TransactionOperation }) {
  const label = describeOperation(operation);
  return (
    <div className="rounded-2xl border border-slate-200 p-3 text-sm dark:border-slate-800">
      <p className="font-medium text-slate-950 dark:text-white">{label}</p>
      <p className="mt-1 text-slate-500 dark:text-slate-400">{operation.reason}</p>
    </div>
  );
}

function resolveDeviceName(deviceId: string) {
  return buildLabDevices.find((device) => device.id === deviceId)?.name ?? deviceId;
}

function describeOperation(operation: TransactionOperation) {
  switch (operation.type) {
    case 'ADD_DEVICE':
      return `Add ${resolveDeviceName(operation.payload.deviceId)}`;
    case 'REMOVE_DEVICE':
      return `Remove ${resolveDeviceName(operation.payload.deviceId)}`;
    case 'REPLACE_DEVICE':
      return `Replace ${resolveDeviceName(operation.payload.fromDeviceId)} with ${resolveDeviceName(operation.payload.toDeviceId)}`;
    case 'ADD_EDGE':
      return `Add ${resolveDeviceName(operation.payload.sourceDeviceId)} → ${resolveDeviceName(operation.payload.targetDeviceId)} (${operation.payload.connection})`;
    case 'REMOVE_EDGE':
      return `Remove edge ${operation.payload.edgeId}`;
    case 'REPLACE_EDGE':
      return `Replace edge ${operation.payload.edgeId} with ${operation.payload.connection}`;
    case 'UPDATE_CONSTRAINTS':
      return `Update constraints (${Object.keys(operation.payload.patch).join(', ') || 'no-op'})`;
  }
}

