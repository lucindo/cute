import { useEffect, useRef, useState, type ReactElement } from 'react'

import { ConfirmDialog } from '../components/ConfirmDialog'
import { TagAssignPanel } from '../components/TagAssignPanel'
import { TagManager } from '../components/TagManager'
import type { UiStrings } from '../content/strings'
import { formatBytes } from '../domain/format'
import { useCollection } from '../hooks/useCollection'
import { useDeleteSource } from '../hooks/useDeleteSource'
import { useImportFiles } from '../hooks/useImportFiles'
import { useStorageQuota } from '../hooks/useStorageQuota'
import { useTags } from '../hooks/useTags'
import { useUiStrings } from '../hooks/useUiStringsContext'
import type { FileRejection } from '../media/importFiles'

function rejectionHint(rejection: FileRejection, strings: UiStrings): string {
  switch (rejection.reason) {
    case 'unsupported-type':
      return strings.collection.rejection.unsupportedType
    case 'undecodable':
      return rejection.mimeType.startsWith('video/')
        ? strings.collection.rejection.undecodableVideo
        : strings.collection.rejection.undecodable
    case 'encode-failed':
      return strings.collection.rejection.encodeFailed
    case 'storage-failed':
      return strings.collection.rejection.storageFailed
  }
}

export function CollectionScreen(): ReactElement {
  const strings = useUiStrings()
  const collection = useCollection()
  const { importState, importFrom } = useImportFiles()
  const { deleteState, deleteById } = useDeleteSource()
  const { tagsState, actionState, rename, remove, applyToSources, createAndAssign } = useTags()
  const quota = useStorageQuota()
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [managing, setManaging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
  const hasSources = collection.status === 'ready' && collection.sources.length > 0

  const toggleSelected = (id: string): void => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  let content: ReactElement | null = null
  if (collection.status === 'error') {
    content = <p className="text-sm text-[var(--color-zen-text-soft)]">{strings.collection.loadError}</p>
  } else if (collection.status === 'ready' && collection.sources.length === 0) {
    content = <p className="text-sm text-[var(--color-zen-text-soft)]">{strings.collection.empty}</p>
  } else if (collection.status === 'ready') {
    content = (
      <ul className="grid w-full grid-cols-3 gap-2 sm:grid-cols-4">
        {collection.sources.map((source) => {
          const isSelected = selected.has(source.id)
          const thumb = (
            <div
              className={`aspect-square overflow-hidden rounded-lg bg-[var(--color-zen-surface)] ${
                isSelected ? 'ring-2 ring-[var(--color-zen-accent)]' : ''
              }`}
            >
              {source.thumbUrl !== null && (
                <img
                  src={source.thumbUrl}
                  alt={source.caption ?? ''}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
          )
          return (
            <li key={source.id}>
              {selecting ? (
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    toggleSelected(source.id)
                  }}
                  className="block w-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zen-accent"
                >
                  {thumb}
                </button>
              ) : (
                <>
                  {thumb}
                  <div className="mt-1 flex items-center justify-between px-0.5">
                    <span className="text-xs text-[var(--color-zen-text-soft)]">
                      {formatBytes(source.bytes)}
                    </span>
                    <button
                      type="button"
                      aria-label={strings.collection.deleteLabel}
                      onClick={() => {
                        setPendingDelete(source.id)
                      }}
                      className="rounded px-1 text-sm leading-none text-[var(--color-zen-muted)] hover:text-[var(--color-destructive)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-destructive)]"
                    >
                      ×
                    </button>
                  </div>
                </>
              )}
            </li>
          )
        })}
      </ul>
    )
  }

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
        aria-label={strings.collection.importButton}
        className="sr-only"
        onChange={(event) => {
          importFrom(Array.from(event.currentTarget.files ?? []))
          event.currentTarget.value = ''
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={importing}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-full bg-[var(--color-zen-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-zen-on-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zen-accent focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {importing ? strings.collection.importing : strings.collection.importButton}
        </button>
        {hasSources && (
          <button
            type="button"
            onClick={() => {
              setSelecting((was) => !was)
              setSelected(new Set())
              setManaging(false)
            }}
            className="rounded-full border border-[var(--color-border-soft)] px-4 py-2 text-sm font-medium text-[var(--color-zen-text)] hover:bg-[var(--color-zen-bg-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zen-accent focus-visible:ring-offset-2"
          >
            {selecting ? strings.collection.selectDone : strings.collection.select}
          </button>
        )}
        {tagsState.status === 'ready' && (
          <button
            type="button"
            aria-expanded={managing}
            onClick={() => {
              setManaging((was) => !was)
              setSelecting(false)
              setSelected(new Set())
            }}
            className="rounded-full border border-[var(--color-border-soft)] px-4 py-2 text-sm font-medium text-[var(--color-zen-text)] hover:bg-[var(--color-zen-bg-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zen-accent focus-visible:ring-offset-2"
          >
            {strings.tags.edit}
          </button>
        )}
      </div>
      {managing && tagsState.status === 'ready' && (
        <div className="mt-4">
          <TagManager tags={tagsState.tags} onRename={rename} onDelete={remove} />
        </div>
      )}
      {selecting && tagsState.status === 'ready' && collection.status === 'ready' && (
        <div className="mt-4">
          <p className="mb-2 text-sm text-[var(--color-zen-text-soft)]">
            {strings.collection.selectedCount(selected.size)}
          </p>
          {selected.size > 0 && (
            <TagAssignPanel
              tags={tagsState.tags}
              selectedSources={collection.sources.filter((s) => selected.has(s.id))}
              onToggle={(tagId, mode) => {
                applyToSources(tagId, [...selected], mode)
              }}
              onCreate={(name) => {
                createAndAssign(name, [...selected])
              }}
            />
          )}
        </div>
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
      <div className="mt-6">{content}</div>
      {collection.status === 'ready' && (
        <p className="mt-6 text-xs text-[var(--color-zen-muted)]">
          {quota !== null
            ? strings.collection.storageGauge(formatBytes(collection.totalBytes), formatBytes(quota))
            : strings.collection.storageUsed(formatBytes(collection.totalBytes))}
        </p>
      )}
      <ConfirmDialog
        open={pendingDelete !== null}
        title={strings.collection.deleteTitle}
        body={strings.collection.deleteBody}
        confirmLabel={strings.collection.deleteConfirm}
        cancelLabel={strings.collection.deleteCancel}
        onConfirm={() => {
          if (pendingDelete !== null) deleteById(pendingDelete)
          setPendingDelete(null)
        }}
        onCancel={() => {
          setPendingDelete(null)
        }}
      />
    </div>
  )
}
