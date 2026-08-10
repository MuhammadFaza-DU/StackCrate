export function getCountUpValue(start: number, end: number, progress: number) {
  const clampedProgress = Math.min(1, Math.max(0, progress));
  return Math.round(start + (end - start) * clampedProgress);
}
