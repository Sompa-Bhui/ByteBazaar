export const BUILD_LAB_STORAGE_KEYS = {
  state: 'bytebazaar-build-lab:v4',
  intro: 'bytebazaar-build-lab:intro-dismissed',
  activeDemo: 'bytebazaar-build-lab:active-demo',
} as const;

export function getBuildLabStorageKeys() {
  return Object.values(BUILD_LAB_STORAGE_KEYS);
}

export function resetBuildLabLocalStateStorage(storage: Storage) {
  for (const key of getBuildLabStorageKeys()) storage.removeItem(key);
}

export function resetCurrentDemoStorage(storage: Storage) {
  storage.removeItem(BUILD_LAB_STORAGE_KEYS.activeDemo);
}

export function isBuildLabIntroDismissed(storage: Storage) {
  return storage.getItem(BUILD_LAB_STORAGE_KEYS.intro) === '1';
}

