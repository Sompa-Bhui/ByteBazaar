export type DeviceCategory =
  | 'LAPTOP'
  | 'DESKTOP'
  | 'MONITOR'
  | 'GPU'
  | 'DOCK'
  | 'KEYBOARD'
  | 'MOUSE'
  | 'STORAGE'
  | 'NETWORKING'
  | 'POWER'
  | 'CABLE'
  | 'DEV_BOARD';

export type ConnectorType =
  | 'USB_C'
  | 'USB_A'
  | 'THUNDERBOLT_4'
  | 'HDMI'
  | 'DISPLAYPORT'
  | 'MINI_DISPLAYPORT'
  | 'PCIe'
  | 'SATA'
  | 'NVME'
  | 'ETHERNET'
  | 'AUX'
  | 'POWER_DC'
  | 'BARREL';

export type OperatingSystem = 'macOS' | 'Windows' | 'Linux' | 'Universal';

export type CompatibilitySeverity = 'INFO' | 'WARNING' | 'ERROR';

export type DeviceCapability = {
  ports?: ConnectorType[];
  inputs?: ConnectorType[];
  outputs?: ConnectorType[];
  protocols?: string[];
  operatingSystems?: OperatingSystem[];
  powerInputW?: number;
  powerOutputW?: number;
  maxDisplayResolution?: string;
  maxRefreshHz?: number;
  bandwidthGbps?: number;
  storageInterfaces?: string[];
  networkStandards?: string[];
  compatibilityTags?: string[];
  dimensionsMm?: { width: number; depth: number; height: number };
  workloadTags?: string[];
  upgradeabilityTags?: string[];
};

export type BuildDevice = {
  id: string;
  name: string;
  slug: string;
  category: DeviceCategory;
  brand: string;
  price: number;
  image: string;
  summary: string;
  capabilities: DeviceCapability;
  tags: string[];
  scoreWeight: number;
  recommendedFor: string[];
};

export type BuildNode = {
  id: string;
  deviceId: string;
  selected: boolean;
};

export type BuildEdgeStatus = 'valid' | 'warning' | 'error';

export type BuildEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  connection: ConnectorType;
  status: BuildEdgeStatus;
};

export type CompatibilityResult = {
  id: string;
  severity: CompatibilitySeverity;
  title: string;
  explanation: string;
  involvedDeviceIds: string[];
  ruleId: string;
  suggestedFix?: string;
};

export type BuildStateV1 = {
  version: 1;
  selectedDeviceId: string | null;
  deviceIds: string[];
};

export type BuildHealthBreakdown = {
  compatibility: number;
  performanceFit: number;
  upgradeability: number;
  budgetFit: number;
  overall: number;
  validRelationships: number;
  warningCount: number;
  errorCount: number;
};
