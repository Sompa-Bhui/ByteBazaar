export function generateSKU(title: string, suffix?: string) {
  const base = title
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 20);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${base}${suffix ? '-' + suffix : ''}-${rand}`;
}
