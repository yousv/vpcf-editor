export function parseColorString(rawValue: string): number[] {
  const stripped = rawValue.replace(/[\[\]]/g, '');
  const parts    = stripped.split(/[,\s]+/).filter(Boolean);
  return parts.slice(0, 4).map(p => Math.min(255, Math.max(0, Math.round(parseFloat(p)))));
}

export function rgbToHex(rgbChannels: number[]): string {
  const [r = 0, g = 0, b = 0] = rgbChannels;
  return '#' + [r, g, b].map(v => Math.min(255, Math.max(0, v)).toString(16).padStart(2, '0')).join('');
}

export function hexToRgb(hexString: string): number[] | null {
  let normalized = hexString.trim().replace('#', '');
  if (normalized.length === 3) normalized = normalized.split('').map(c => c + c).join('');
  if (normalized.length !== 6) return null;
  const red   = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue  = parseInt(normalized.slice(4, 6), 16);
  if (isNaN(red) || isNaN(green) || isNaN(blue)) return null;
  return [red, green, blue];
}

export function isValidHex(hexString: string): boolean {
  const normalized = hexString.trim().replace('#', '');
  return (normalized.length === 3 || normalized.length === 6) && /^[0-9a-fA-F]+$/.test(normalized);
}

export function colorDistance(rgbA: number[], rgbB: number[]): number {
  const deltaR = (rgbA[0] ?? 0) - (rgbB[0] ?? 0);
  const deltaG = (rgbA[1] ?? 0) - (rgbB[1] ?? 0);
  const deltaB = (rgbA[2] ?? 0) - (rgbB[2] ?? 0);
  return Math.sqrt(deltaR * deltaR + deltaG * deltaG + deltaB * deltaB);
}

export function colorsAreEqual(rgbA: number[], rgbB: number[]): boolean {
  return rgbA[0] === rgbB[0] && rgbA[1] === rgbB[1] && rgbA[2] === rgbB[2];
}
