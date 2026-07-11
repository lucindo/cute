import { useEffect, useRef, useState, type ReactElement } from 'react'

import { ConfirmDialog } from '../components/ConfirmDialog'
import type { UiStrings } from '../content/strings'
import { formatBytes } from '../domain/format'
import { useCollection } from '../hooks/useCollection'
import { useDeleteSource } from '../hooks/useDeleteSource'
import { useImportFiles } from '../hooks/useImportFiles'
import { useStorageEstimate } from '../hooks/useStorageEstimate'
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
  const estimate = useStorageEstimate()
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
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

  let content: ReactElement | null = null
  if (collection.status === 'error') {
    content = <p className="text-sm text-[var(--color-zen-text-soft)]">{strings.collection.loadError}</p>
  } else if (collection.status === 'ready' && collection.sources.length === 0) {
    content = <p className="text-sm text-[var(--color-zen-text-soft)]">{strings.collection.empty}</p>
  } else if (collection.status === 'ready') {
    content = (
      <ul className="grid w-full grid-cols-3 gap-2 sm:grid-cols-4">
        {collection.sources.map((source) => (
          <li key={source.id}>
            <div className="aspect-square overflow-hidden rounded-lg bg-[var(--color-zen-surface)]">
              {source.thumbUrl !== null && (
                <img
                  src={source.thumbUrl}
                  alt={source.caption ?? ''}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
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
          </li>
        ))}
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
      <button
        type="button"
        disabled={importing}
        onClick={() => fileInputRef.current?.click()}
        className="rounded-full bg-[var(--color-zen-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-zen-on-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zen-accent focus-visible:ring-offset-2 disabled:opacity-60"
      >
        {importing ? strings.collection.importing : strings.collection.importButton}
      </button>
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
      {estimate !== null && (
        <p className="mt-6 text-xs text-[var(--color-zen-muted)]">
          {strings.collection.storageGauge(formatBytes(estimate.usage), formatBytes(estimate.quota))}
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
