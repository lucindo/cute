// Clock-style m:ss (minutes uncapped for long overtime). Used by the session
// overlay and completion summary.
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes)}:${String(seconds).padStart(2, '0')}`
}

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
