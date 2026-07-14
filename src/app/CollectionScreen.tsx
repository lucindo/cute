import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react'

import { ConfirmDialog } from '../components/ConfirmDialog'
import { SourceSheet } from '../components/SourceSheet'
import { PlusIcon } from '../components/icons/PlusIcon'
import { TagIcon } from '../components/icons/TagIcon'
import { IconButton, type IconButtonSize } from '../components/primitives/IconButton'
import { SegmentedControl } from '../components/primitives/SegmentedControl'
import type { UiStrings } from '../content/strings'
import { formatBytes, formatDuration } from '../domain/format'
import { useCollection } from '../hooks/useCollection'
import { useDeleteSource } from '../hooks/useDeleteSource'
import { useImportFiles } from '../hooks/useImportFiles'
import { useSaveSource } from '../hooks/useSaveSource'
import { useStorageQuota } from '../hooks/useStorageQuota'
import { useTags } from '../hooks/useTags'
import { useUiStrings } from '../hooks/useUiStringsContext'
import type { FileRejection } from '../media/importFiles'

function rejectionHint(rejection: FileRejection, strings: UiStrings): string {
  switch (rejection.reason) {
    case 'unsupported-type':
      return strings.collection.rejection.unsupportedType
    case 'undecodable':
      if (!rejection.mimeType.startsWith('video/')) return strings.collection.rejection.undecodable
      // v0.5 diagnostic suffix — surface mime type + probe failure stage.
      return `${strings.collection.rejection.undecodableVideo} [${rejection.mimeType}${rejection.detail !== undefined ? ` · ${rejection.detail}` : ''}]`
    case 'encode-failed':
      return strings.collection.rejection.encodeFailed
    case 'storage-failed':
      return strings.collection.rejection.storageFailed
  }
}

export interface CollectionScreenProps {
  onOpenTags(this: void): void
}

export function CollectionScreen({ onOpenTags }: CollectionScreenProps): ReactElement {
  const strings = useUiStrings()
  const collection = useCollection()
  const { importState, importFrom } = useImportFiles()
  const { deleteState, deleteById } = useDeleteSource()
  const { saveState, saveSource } = useSaveSource()
  const { tagsState, actionState, create } = useTags()
  const quota = useStorageQuota()
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [openSourceId, setOpenSourceId] = useState<string | null>(null)
  // Session-local like the practice tag filter — a sort is a per-visit choice.
  const [sortMode, setSortMode] = useState<'recent' | 'aww'>('recent')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Aww sort is a stable re-order of the newest-first base by descending
  // lifetime held time (FR-17/AC-7); ties keep newest-first. Memoized so it
  // re-sorts only on source/sort-mode change, not every unrelated re-render.
  const orderedSources = useMemo(() => {
    if (collection.status !== 'ready') return []
    return sortMode === 'aww'
      ? [...collection.sources].sort((a, b) => b.totalHeldMs - a.totalHeldMs)
      : collection.sources
  }, [collection, sortMode])

  useEffect(() => {
    const onPaste = (event: ClipboardEvent): void => {
      const files = event.clipboardData?.files
      if (files !== undefined && files.length > 0) {
        event.preventDefault()
        importFrom(Array.from(files))
      }
    }
    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('paste', onPaste)
    }
  }, [importFrom])

  const importing = importState.status === 'importing'
  const isEmpty = collection.status === 'ready' && collection.sources.length === 0
  const hasItems = collection.status === 'ready' && collection.sources.length > 0

  const importButton = (size: IconButtonSize): ReactElement => (
    <IconButton
      size={size}
      disabled={importing}
      label={importing ? strings.collection.importing : strings.collection.importButton}
      onClick={() => fileInputRef.current?.click()}
      icon={
        importing ? (
          // Loading feedback is essential, so the spin runs even under
          // prefers-reduced-motion — a frozen spinner communicates nothing.
          <span
            aria-hidden="true"
            className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        ) : (
          <PlusIcon />
        )
      }
    />
  )

  const grid = (
    <ul className="grid w-full grid-cols-3 gap-2 sm:grid-cols-4">
      {orderedSources.map((source) => (
        <li key={source.id}>
          <button
            type="button"
            aria-label={strings.collection.openItem}
            onClick={() => {
              setOpenSourceId(source.id)
            }}
            className="block w-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zen-accent"
          >
            <div className="aspect-square overflow-hidden rounded-lg bg-[var(--color-zen-surface)]">
              {source.thumbUrl !== null && (
                <img src={source.thumbUrl} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <p
              // Supplementary visual metadata; keep the stat out of the
              // button's accessible name.
              aria-hidden="true"
              className="mt-1 text-center text-[11px] tabular-nums text-[var(--color-zen-text-soft)]"
            >
              {strings.collection.holdStat(source.holdCount, formatDuration(source.totalHeldMs))}
            </p>
          </button>
        </li>
      ))}
    </ul>
  )

  const openSource =
    collection.status === 'ready'
      ? (collection.sources.find((s) => s.id === openSourceId) ?? null)
      : null

  return (
    <div
      className="w-full"
      onDragOver={(event) => {
        event.preventDefault()
      }}
      onDrop={(event) => {
        event.preventDefault()
        importFrom(Array.from(event.dataTransfer.files))
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        tabIndex={-1}
        className="sr-only"
        onChange={(event) => {
          importFrom(Array.from(event.currentTarget.files ?? []))
          event.currentTarget.value = ''
        }}
      />
      {collection.status === 'error' && (
        <p className="mt-6 text-center text-sm text-[var(--color-zen-text-soft)]">
          {strings.collection.loadError}
        </p>
      )}
      {isEmpty && (
        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          {importButton('md')}
          <p className="max-w-xs text-sm text-[var(--color-zen-text-soft)]">{strings.collection.empty}</p>
        </div>
      )}
      {hasItems && (
        <>
          <div className="mt-6 flex items-center justify-between gap-3">
            <div className="w-64">
              <SegmentedControl<'recent' | 'aww'>
                options={[
                  { id: 'recent', label: strings.collection.sortRecent },
                  { id: 'aww', label: strings.collection.sortAww },
                ]}
                value={sortMode}
                onChange={setSortMode}
                ariaLabel={strings.collection.sortLabel}
              />
            </div>
            {importButton('sm')}
            {tagsState.status === 'ready' && (
              <IconButton
                size="sm"
                icon={<TagIcon />}
                label={strings.tags.edit}
                onClick={onOpenTags}
              />
            )}
          </div>
          <div className="mt-6">{grid}</div>
        </>
      )}
      {actionState.status === 'error' && (
        <p className="mt-3 text-sm text-[var(--color-zen-text-soft)]">{strings.tags.actionFailed}</p>
      )}
      {importState.status === 'done' && importState.rejected.length > 0 && (
        <ul className="mt-3 space-y-1">
          {importState.rejected.map((entry, index) => (
            <li key={`${String(index)}-${entry.name}`} className="text-sm text-[var(--color-zen-text-soft)]">
              {entry.name} — {rejectionHint(entry.rejection, strings)}
            </li>
          ))}
        </ul>
      )}
      {deleteState.status === 'error' && (
        <p className="mt-3 text-sm text-[var(--color-zen-text-soft)]">
          {strings.collection.deleteFailed}
        </p>
      )}
      {saveState.status === 'error' && (
        <p className="mt-3 text-sm text-[var(--color-zen-text-soft)]">
          {strings.collection.saveFailed}
        </p>
      )}
      {collection.status === 'ready' && (
        <p className="mt-6 text-xs text-[var(--color-zen-muted)]">
          {quota !== null
            ? strings.collection.storageGauge(formatBytes(collection.totalBytes), formatBytes(quota))
            : strings.collection.storageUsed(formatBytes(collection.totalBytes))}
        </p>
      )}
      <SourceSheet
        source={openSource}
        tags={tagsState.status === 'ready' ? tagsState.tags : []}
        onCreateTag={create}
        onSave={saveSource}
        onRequestDelete={(id) => {
          setPendingDelete(id)
        }}
        onClose={() => {
          setOpenSourceId(null)
        }}
      />
      <ConfirmDialog
        open={pendingDelete !== null}
        title={strings.collection.deleteTitle}
        body={strings.collection.deleteBody}
        confirmLabel={strings.collection.deleteConfirm}
        cancelLabel={strings.collection.deleteCancel}
        onConfirm={() => {
          if (pendingDelete !== null) deleteById(pendingDelete)
          setPendingDelete(null)
          setOpenSourceId(null)
        }}
        onCancel={() => {
          setPendingDelete(null)
        }}
      />
    </div>
  )
}
