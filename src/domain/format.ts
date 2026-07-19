// Clock-style m:ss (minutes uncapped for long overtime). Used by the session
// overlay and completion summary.
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes)}:${String(seconds).padStart(2, '0')}`
}

// Zero-padded mm:ss for the session countdown, which reads as a clock — 09:59
// keeps a steady shape as it ticks down. Elapsed durations keep formatDuration's
// bare minutes: "longest hold: 0:12" would read oddly as "00:12". Padding to 5
// only ever affects single-digit minutes; m:ss is never shorter.
export function formatClock(ms: number): string {
  return formatDuration(ms).padStart(5, '0')
}

// Human-readable lifetime total (s / m / h m) for the Stats page. Unlike
// formatDuration's per-session m:ss clock, which reads absurdly past an hour
// (e.g. "437:12") once totals accumulate.
export function formatTotalDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  if (totalSeconds < 60) return `${String(totalSeconds)}s`
  const minutes = Math.floor(totalSeconds / 60)
  const hours = Math.floor(minutes / 60)
  if (hours === 0) return `${String(minutes)}m`
  const remMinutes = minutes % 60
  return remMinutes > 0 ? `${String(hours)}h ${String(remMinutes)}m` : `${String(hours)}h`
}

// Decimal units, matching what OS storage meters report (1 MB = 1e6 bytes).
export function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${String(bytes)} B`
  let value = bytes
  for (const unit of ['KB', 'MB'] as const) {
    value /= 1000
    // Threshold on the rounded value so e.g. 999_960 promotes to "1.0 MB"
    // instead of rendering the same unit as "1000.0 KB".
    const rounded = Math.round(value * 10) / 10
    if (rounded < 1000) return `${rounded.toFixed(1)} ${unit}`
  }
  return `${(value / 1000).toFixed(1)} GB`
}
