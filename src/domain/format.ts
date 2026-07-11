// Decimal units, matching what OS storage meters report (1 MB = 1e6 bytes).
export function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${String(bytes)} B`
  let value = bytes
  for (const unit of ['KB', 'MB'] as const) {
    value /= 1000
    if (value < 1000) return `${value.toFixed(1)} ${unit}`
  }
  return `${(value / 1000).toFixed(1)} GB`
}
