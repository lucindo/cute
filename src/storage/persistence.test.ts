import { describe, expect, it } from 'vitest'

import { requestPersistence } from './persistence'

describe('requestPersistence', () => {
  it('returns the granted state from the storage manager', async () => {
    await expect(requestPersistence({ storage: { persist: () => Promise.resolve(true) } }))
      .resolves.toBe(true)
    await expect(requestPersistence({ storage: { persist: () => Promise.resolve(false) } }))
      .resolves.toBe(false)
  })

  it('returns false when persist rejects', async () => {
    const storage = { persist: () => Promise.reject(new Error('denied')) }
    await expect(requestPersistence({ storage })).resolves.toBe(false)
  })

  it('returns false when the API is absent', async () => {
    // jsdom's navigator has no StorageManager, which is exactly the
    // older-Safari default path under test.
    await expect(requestPersistence()).resolves.toBe(false)
  })
})
