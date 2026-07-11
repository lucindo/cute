// navigator.storage.persist() asks the browser to exempt this origin's data
// from eviction — the worst failure mode for an app holding the user's only
// copy of their media (SPEC FR-42). Idempotent, so it runs on every launch.

export interface PersistenceDeps {
  storage?: Pick<StorageManager, 'persist'> // defaults to navigator.storage
}

// Progressive enhancement: absence (older Safari), denial, and failure all
// mean the same thing to callers — persistence is not guaranteed.
export async function requestPersistence(deps: PersistenceDeps = {}): Promise<boolean> {
  const storage = deps.storage ?? navigator.storage
  try {
    return await storage.persist()
  } catch {
    return false
  }
}
