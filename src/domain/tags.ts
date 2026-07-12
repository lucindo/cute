// Tag catalog domain. Seeded tags are stored with name null so their display
// name follows the locale (SPEC FR-13/AC-21); renaming freezes a literal name.

export const SEEDED_TAG_IDS = [
  'seed:babies',
  'seed:kittens',
  'seed:puppies',
  'seed:family',
  'seed:bhakti',
] as const

export type SeededTagId = (typeof SEEDED_TAG_IDS)[number]

export function tagDisplayName(
  tag: { id: string; name: string | null },
  seededNames: Readonly<Record<string, string>>,
): string {
  return tag.name ?? seededNames[tag.id] ?? tag.id
}
