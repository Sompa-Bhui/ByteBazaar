import { buildLabDevices } from './data';
import type { Conflict } from './solver';

export type AutoFixOperation =
  | { type: 'add-device'; deviceId: string }
  | { type: 'remove-device'; deviceId: string }
  | { type: 'replace-device'; fromDeviceId: string; toDeviceId: string }
  | { type: 'replace-edge'; fromDeviceId: string; toDeviceId: string; connection: string }
  | { type: 'downgrade-requirement'; constraintId: string; explanation: string };

export type AutoFixPlan = {
  id: string;
  title: string;
  operations: AutoFixOperation[];
  conflictsResolved: string[];
  newConflictsIntroduced: string[];
  priceDeltaINR: number;
  healthDelta: number;
  tradeoffs: string[];
  explanation: string;
};

function priceById(deviceId: string) {
  return buildLabDevices.find((device) => device.id === deviceId)?.price ?? 0;
}

export function generateAutoFixPlans(conflicts: Conflict[], selectedDeviceIds: string[]): AutoFixPlan[] {
  const plans: AutoFixPlan[] = [];
  const budgetConflict = conflicts.find((item) => item.category === 'BUDGET');
  if (budgetConflict) {
    const cheaper = buildLabDevices.filter((device) => !selectedDeviceIds.includes(device.id)).sort((a, b) => a.price - b.price)[0];
    if (cheaper) {
      const delta = cheaper.price - selectedDeviceIds.reduce((sum, id) => sum + priceById(id), 0);
      plans.push({
        id: 'fix-cheapest',
        title: 'Swap to cheapest viable subset',
        operations: [{ type: 'replace-device', fromDeviceId: selectedDeviceIds[0], toDeviceId: cheaper.id }],
        conflictsResolved: [budgetConflict.id],
        newConflictsIntroduced: [],
        priceDeltaINR: delta,
        healthDelta: -8,
        tradeoffs: ['Lower performance', 'Less upgrade headroom'],
        explanation: 'Reduce total cost by replacing the priciest device first.',
      });
    }
  }

  const powerConflict = conflicts.find((item) => item.category === 'POWER');
  if (powerConflict) {
    const charger = buildLabDevices.filter((device) => device.category === 'POWER' || device.category === 'DOCK').sort((a, b) => (b.capabilities.powerOutputW ?? 0) - (a.capabilities.powerOutputW ?? 0))[0];
    if (charger) {
      plans.push({
        id: 'fix-power',
        title: 'Upgrade power delivery',
        operations: [{ type: 'replace-device', fromDeviceId: powerConflict.involvedDeviceIds[1] ?? selectedDeviceIds[0], toDeviceId: charger.id }],
        conflictsResolved: [powerConflict.id],
        newConflictsIntroduced: [],
        priceDeltaINR: charger.price - (priceById(powerConflict.involvedDeviceIds[1] ?? selectedDeviceIds[0])),
        healthDelta: 10,
        tradeoffs: ['Higher cost', 'More cable bulk'],
        explanation: 'Use a higher-wattage compatible charger or dock.',
      });
    }
  }

  const displayConflict = conflicts.find((item) => item.category === 'DISPLAY');
  if (displayConflict) {
    const monitor = buildLabDevices.filter((device) => device.category === 'MONITOR').sort((a, b) => b.capabilities.maxRefreshHz! - a.capabilities.maxRefreshHz!)[0];
    if (monitor) {
      plans.push({
        id: 'fix-display',
        title: 'Add or replace with compatible display',
        operations: [{ type: 'add-device', deviceId: monitor.id }],
        conflictsResolved: [displayConflict.id],
        newConflictsIntroduced: [],
        priceDeltaINR: monitor.price,
        healthDelta: 7,
        tradeoffs: ['Higher power draw', 'More desk space'],
        explanation: 'Choose a display that meets count and bandwidth requirements.',
      });
    }
  }

  if (!plans.length) {
    plans.push({
      id: 'fix-none',
      title: 'No repair needed',
      operations: [],
      conflictsResolved: [],
      newConflictsIntroduced: [],
      priceDeltaINR: 0,
      healthDelta: 0,
      tradeoffs: [],
      explanation: 'The current build does not require a repair plan.',
    });
  }

  return plans;
}
