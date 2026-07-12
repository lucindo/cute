// Session-setup domain: duration constraints (SPEC FR-23) — 1–30 minutes,
// 1-minute steps, default 5.

export const SESSION_DURATION_MIN = 1
export const SESSION_DURATION_MAX = 30
export const DEFAULT_SESSION_DURATION = 5

// Stepper options: every whole minute from MIN to MAX inclusive.
export const SESSION_DURATIONS: readonly number[] = Array.from(
  { length: SESSION_DURATION_MAX - SESSION_DURATION_MIN + 1 },
  (_, i) => SESSION_DURATION_MIN + i,
)

export function isValidSessionDuration(raw: unknown): raw is number {
  return (
    typeof raw === 'number' &&
    Number.isInteger(raw) &&
    raw >= SESSION_DURATION_MIN &&
    raw <= SESSION_DURATION_MAX
  )
}

export function coerceSessionDuration(raw: unknown): number {
  return isValidSessionDuration(raw) ? raw : DEFAULT_SESSION_DURATION
}
