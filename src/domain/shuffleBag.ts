// Shuffle-bag source ordering (SPEC FR-27): the pool is shuffled into a queue
// and dealt in order; when the queue empties it is reshuffled, with the first
// deal of the fresh bag guaranteed to differ from the last dealt source (no
// back-to-back repeat across the boundary) whenever the pool has >1 source.

export type Rng = () => number // [0, 1)

export interface ShuffleBag {
  readonly pool: readonly string[]
  readonly queue: readonly string[]
}

function shuffle(items: readonly string[], rng: Rng): string[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const a = out[i]
    const b = out[j]
    if (a !== undefined && b !== undefined) {
      out[i] = b
      out[j] = a
    }
  }
  return out
}

// Reshuffle the pool, ensuring the first element differs from avoidId when the
// pool has more than one source.
function refill(pool: readonly string[], avoidId: string | undefined, rng: Rng): string[] {
  const next = shuffle(pool, rng)
  const head = next[0]
  if (avoidId !== undefined && next.length > 1 && head === avoidId) {
    const swapAt = 1 + Math.floor(rng() * (next.length - 1))
    const other = next[swapAt]
    if (other !== undefined) {
      next[0] = other
      next[swapAt] = head
    }
  }
  return next
}

export function createBag(pool: readonly string[], rng: Rng): ShuffleBag {
  return { pool, queue: shuffle(pool, rng) }
}

// Deal the next source, refilling (with a boundary guard) when the queue is
// empty. Returns the dealt id and the advanced bag.
export function deal(
  bag: ShuffleBag,
  avoidId: string | undefined,
  rng: Rng,
): { id: string; bag: ShuffleBag } {
  const queue = bag.queue.length > 0 ? [...bag.queue] : refill(bag.pool, avoidId, rng)
  const id = queue.shift()
  if (id === undefined) throw new Error('deal from empty pool') // Start is pool-guarded
  return { id, bag: { pool: bag.pool, queue } }
}
