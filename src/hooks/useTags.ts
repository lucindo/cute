// Tag catalog read model + mutations. Reads on mount and on
// TAGS_CHANGED_EVENT; mutations open their own connection, then announce.
// Deleting a tag also rewrites sources, so it announces
// COLLECTION_CHANGED_EVENT too. One mutation at a time, mirroring
// useDeleteSource.

import { useCallback, useEffect, useRef, useState } from 'react'

import { COLLECTION_CHANGED_EVENT } from './useCollection'
import type { Result } from '../domain/result'
import {
  createTag,
  deleteTag,
  getAllRecords,
  openDb,
  renameTag,
  type StorageError,
  type TagRecord,
} from '../storage'

export const TAGS_CHANGED_EVENT = 'cute:tags-changed'

export type TagsState =
  | { status: 'loading' }
  | { status: 'error'; error: StorageError }
  | { status: 'ready'; tags: TagRecord[] }

export type TagActionState =
  | { status: 'idle' }
  | { status: 'busy' }
  | { status: 'error'; error: StorageError }

export interface UseTags {
  tagsState: TagsState
  actionState: TagActionState
  create: (name: string) => void
  rename: (id: string, name: string) => void
  remove: (id: string) => void
}

export function useTags(): UseTags {
  const [tagsState, setTagsState] = useState<TagsState>({ status: 'loading' })
  const [actionState, setActionState] = useState<TagActionState>({ status: 'idle' })
  const busy = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function load(): Promise<void> {
      const opened = await openDb()
      if (!opened.ok) {
        if (!cancelled) setTagsState({ status: 'error', error: opened.error })
        return
      }
      const tags = await getAllRecords(opened.value, 'tags')
      opened.value.close()
      if (cancelled) return
      if (!tags.ok) {
        setTagsState({ status: 'error', error: tags.error })
        return
      }
      setTagsState({ status: 'ready', tags: tags.value })
    }

    void load()
    const onChanged = (): void => {
      void load()
    }
    window.addEventListener(TAGS_CHANGED_EVENT, onChanged)
    return () => {
      cancelled = true
      window.removeEventListener(TAGS_CHANGED_EVENT, onChanged)
    }
  }, [])

  const mutate = useCallback(
    (
      op: (db: IDBDatabase) => Promise<Result<unknown, StorageError>>,
      alsoCollection: boolean,
    ): void => {
      if (busy.current) return
      busy.current = true
      setActionState({ status: 'busy' })
      void (async () => {
        const opened = await openDb()
        if (!opened.ok) {
          setActionState({ status: 'error', error: opened.error })
          busy.current = false
          return
        }
        const result = await op(opened.value)
        opened.value.close()
        if (!result.ok) {
          setActionState({ status: 'error', error: result.error })
          busy.current = false
          return
        }
        setActionState({ status: 'idle' })
        busy.current = false
        window.dispatchEvent(new Event(TAGS_CHANGED_EVENT))
        if (alsoCollection) window.dispatchEvent(new Event(COLLECTION_CHANGED_EVENT))
      })()
    },
    [],
  )

  const create = useCallback(
    (name: string): void => {
      mutate((db) => createTag(db, name), false)
    },
    [mutate],
  )
  const rename = useCallback(
    (id: string, name: string): void => {
      mutate((db) => renameTag(db, id, name), false)
    },
    [mutate],
  )
  const remove = useCallback(
    (id: string): void => {
      mutate((db) => deleteTag(db, id), true)
    },
    [mutate],
  )

  return { tagsState, actionState, create, rename, remove }
}
