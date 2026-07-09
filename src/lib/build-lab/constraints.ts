import type { OperatingSystem, DeviceCategory } from './types';

export type Workload = 'FRONTEND_DEV' | 'BACKEND_DEV' | 'MOBILE_DEV' | 'AI_ML' | 'VIDEO_EDITING' | 'GAMING' | 'GENERAL_PRODUCTIVITY';

export type BuildConstraints = {
  maxBudgetINR: number;
  preferredBudgetINR?: number;
  maxDeskWidthMm?: number;
  maxDeskDepthMm?: number;
  primaryOS: OperatingSystem | 'ANY';
  ownedDeviceIds: string[];
  requiredDeviceCategories: DeviceCategory[];
  excludedDeviceIds: string[];
  workload: Workload;
  minExternalDisplays?: number;
  targetResolution?: string;
  minRefreshRateHz?: number;
  requiredProtocols: string[];
  requiredNetworkStandards: string[];
  minimumLaptopChargingW?: number;
  prioritizeBudget: boolean;
  prioritizePerformance: boolean;
  prioritizeUpgradeability: boolean;
  prioritizeCompactness: boolean;
};

export type ConstraintStatus = 'SATISFIED' | 'VIOLATED' | 'PARTIAL';
export type ConstraintType = 'HARD' | 'SOFT';

export type ConstraintCheck = {
  constraintId: string;
  type: ConstraintType;
  status: ConstraintStatus;
  explanation: string;
  involvedDeviceIds: string[];
  numericImpact?: number;
};

export function createDefaultConstraints(): BuildConstraints {
  return {
    maxBudgetINR: 250000,
    preferredBudgetINR: 180000,
    maxDeskWidthMm: 1400,
    maxDeskDepthMm: 700,
    primaryOS: 'ANY',
    ownedDeviceIds: [],
    requiredDeviceCategories: ['LAPTOP', 'MONITOR', 'KEYBOARD', 'MOUSE'],
    excludedDeviceIds: [],
    workload: 'GENERAL_PRODUCTIVITY',
    minExternalDisplays: 1,
    targetResolution: '3440x1440',
    minRefreshRateHz: 60,
    requiredProtocols: ['USB_C'],
    requiredNetworkStandards: [],
    minimumLaptopChargingW: 65,
    prioritizeBudget: true,
    prioritizePerformance: false,
    prioritizeUpgradeability: false,
    prioritizeCompactness: false,
  };
}
