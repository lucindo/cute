import '@testing-library/jest-dom/vitest'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, vi } from 'vitest'

// Clear localStorage before every test so persisted state from one test does
// not contaminate the next test's mount-time restore. Storage-specific tests
// that need pre-seeded data call localStorage.setItem() in their own
// beforeEach / test body — this global clear runs first.
beforeEach(() => {
  // Reason: jsdom always defines window, but the guard is kept for environments where this setup may run outside jsdom.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (typeof window !== 'undefined' && typeof window.localStorage?.clear === 'function') {
    window.localStorage.clear()
  }
})

// Fresh global IndexedDB per test (jsdom ships none) — components that open
// the default connection get an isolated, empty fake; tests seed it through
// the same global. Storage unit tests keep injecting their own factories.
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
})

// URL.createObjectURL/revokeObjectURL fakes — unconditional override: vitest
// wires these to Node's implementations, which accept only node:buffer Blobs,
// while blobs read back from fake-indexeddb are degraded jsdom clones. Distinct
// fake URLs per call; revocation is a no-op that tests observe via vi.spyOn.
let objectUrlCounter = 0
URL.createObjectURL = () => {
  objectUrlCounter += 1
  return `blob:fake-${String(objectUrlCounter)}`
}
URL.revokeObjectURL = () => {}

// localStorage polyfill — Node 25+ ships a built-in localStorage that is a
// non-functional empty object when `--localstorage-file` is not provided
// (overriding jsdom's functional Storage). Tests that spy on Storage.prototype
// methods or call clear() require a fully-operational Storage instance.
//
// Strategy: install methods on `Storage.prototype` so `vi.spyOn` finds them on
// the prototype chain, but back each fake Storage instance with its OWN Map via
// a WeakMap keyed on the instance itself — localStorage and sessionStorage stay
// isolated from each other.
// Reason: jsdom always defines window, but the guard is kept for environments where this setup may run outside jsdom.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (typeof window !== 'undefined' && typeof window.localStorage?.getItem !== 'function') {
  const _stores = new WeakMap<object, Map<string, string>>()

  function storeFor(instance: object): Map<string, string> {
    let s = _stores.get(instance)
    if (!s) {
      s = new Map<string, string>()
      _stores.set(instance, s)
    }
    return s
  }

  function makeFakeStorage(): Storage {
    const fake = Object.create(Storage.prototype) as Storage
    // Pre-create the backing Map so `instance.length` works before first write.
    _stores.set(fake, new Map<string, string>())
    return fake
  }

  Storage.prototype.getItem = function (key: string): string | null {
    const s = storeFor(this)
    return s.has(key) ? (s.get(key) ?? null) : null
  }
  Storage.prototype.setItem = function (key: string, value: string): void {
    storeFor(this).set(key, value)
  }
  Storage.prototype.removeItem = function (key: string): void {
    storeFor(this).delete(key)
  }
  Storage.prototype.clear = function (): void {
    storeFor(this).clear()
  }
  Storage.prototype.key = function (index: number): string | null {
    return [...storeFor(this).keys()][index] ?? null
  }
  Object.defineProperty(Storage.prototype, 'length', {
    get() { return storeFor(this as object).size },
    configurable: true,
  })

  Object.defineProperty(window, 'localStorage', {
    writable: true,
    configurable: true,
    value: makeFakeStorage(),
  })
  Object.defineProperty(window, 'sessionStorage', {
    writable: true,
    configurable: true,
    value: makeFakeStorage(),
  })
}

// HTMLDialogElement polyfill — jsdom 29.1.1 does not implement show/showModal/close.
// See github.com/jsdom/jsdom/issues/3294.
if (typeof HTMLDialogElement !== 'undefined') {
  // Reason: jsdom may not implement showModal; guard ensures polyfill is only applied when missing.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true
    }
  }
  // Reason: jsdom may not implement show; guard ensures polyfill is only applied when missing.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!HTMLDialogElement.prototype.show) {
    HTMLDialogElement.prototype.show = function () {
      this.open = true
    }
  }
  // Reason: jsdom may not implement close; guard ensures polyfill is only applied when missing.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function (returnValue?: string) {
      this.open = false
      if (returnValue !== undefined) this.returnValue = returnValue
      this.dispatchEvent(new Event('close'))
    }
  }
}

// window.matchMedia polyfill — jsdom has no layout engine and does not implement
// matchMedia. Default `matches: false` keeps the suite under "motion ALLOWED"
// semantics; reduced-motion tests override with vi.spyOn(window, 'matchMedia').
// Reason: jsdom always defines window, but the guards are kept for environments where this setup may run outside jsdom.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

// navigator.wakeLock polyfill — jsdom 29.1.1 does not implement the Screen Wake
// Lock API. Per-test failure paths use vi.spyOn(navigator.wakeLock, 'request');
// API-absent paths override navigator.wakeLock with undefined — both rely on
// the configurable flag below.
if (typeof navigator !== 'undefined' && !('wakeLock' in navigator)) {
  class FakeWakeLockSentinel extends EventTarget {
    type: WakeLockType = 'screen'
    released = false
    // Reason: onrelease matches the WakeLockSentinel.onrelease DOM property signature which uses any for the handler return type.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onrelease: ((this: WakeLockSentinel, ev: Event) => any) | null = null

    // Reason: async signature matches WakeLockSentinel.release() API contract; no real async work in the fake.
    // eslint-disable-next-line @typescript-eslint/require-await
    async release(): Promise<void> {
      if (this.released) return
      this.released = true
      const event = new Event('release')
      // Reason: this is cast to WakeLockSentinel to match the onrelease callback's `this` type; FakeWakeLockSentinel structurally matches.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      if (this.onrelease) this.onrelease.call(this as unknown as WakeLockSentinel, event)
      this.dispatchEvent(event)
    }
  }

  Object.defineProperty(navigator, 'wakeLock', {
    writable: true,
    configurable: true,
    value: {
      // Reason: async signature matches WakeLock.request() API contract; the parameter is intentionally unused in the fake.
      // eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-unused-vars
      request: vi.fn(async (_type?: WakeLockType) => new FakeWakeLockSentinel()),
    },
  })
}
