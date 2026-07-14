// Pure image-import logic: byte-level animation detection and dimension math.
// Canvas/bitmap work lives in src/media/ — this module never touches the DOM.

// Re-encode cap for imported stills (SPEC FR-8) and thumbnail edge (FR-11).
export const SOURCE_MAX_EDGE = 2000
export const THUMB_MAX_EDGE = 300

// Scale down to fit maxEdge, preserving aspect ratio; never upscales.
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= maxEdge) return { width, height }
  const scale = maxEdge / longest
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

// Animated GIFs must be stored as-is — re-encoding through a canvas would
// keep only the first frame. Animated = more than one image descriptor, found
// by walking the block structure (naive 0x2C scans false-positive on pixel
// data). Malformed input returns false: the decode gate rejects it later.
export function isAnimatedGif(bytes: Uint8Array): boolean {
  // 'GIF8' magic; too-short data cannot hold even one frame.
  if (bytes.length < 14) return false
  if (bytes[0] !== 0x47 || bytes[1] !== 0x49 || bytes[2] !== 0x46 || bytes[3] !== 0x38) {
    return false
  }
  let pos = 13
  const screenPacked = bytes[10] ?? 0
  if ((screenPacked & 0x80) !== 0) pos += 3 * (2 << (screenPacked & 0x07)) // global color table
  let frames = 0
  while (pos < bytes.length) {
    const marker = bytes[pos]
    pos += 1
    if (marker === 0x3b) break // trailer
    if (marker === 0x21) {
      // extension: label byte, then data sub-blocks
      pos = skipSubBlocks(bytes, pos + 1)
    } else if (marker === 0x2c) {
      frames += 1
      if (frames >= 2) return true
      const localPacked = bytes[pos + 8] ?? 0
      pos += 9 // image descriptor body
      if ((localPacked & 0x80) !== 0) pos += 3 * (2 << (localPacked & 0x07)) // local color table
      pos = skipSubBlocks(bytes, pos + 1) // LZW min code size byte, then data
    } else {
      return false // corrupt block stream
    }
  }
  return false
}

// GIF data sub-blocks: length-prefixed runs ending with a 0x00 block.
function skipSubBlocks(bytes: Uint8Array, pos: number): number {
  while (pos < bytes.length) {
    const length = bytes[pos] ?? 0
    pos += 1
    if (length === 0) return pos
    pos += length
  }
  return pos
}

// Animated WebP always carries an extended (VP8X) header with the animation
// flag set — no chunk walk needed.
export function isAnimatedWebp(bytes: Uint8Array): boolean {
  if (bytes.length < 21) return false
  const riff = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
  const webp = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  const vp8x = bytes[12] === 0x56 && bytes[13] === 0x50 && bytes[14] === 0x38 && bytes[15] === 0x58
  if (!riff || !webp || !vp8x) return false
  return (((bytes[20] ?? 0) & 0x02) !== 0)
}
