// UI strings catalog — all UI strings live here, not inline in components.
// Sub-objects per surface: shell.* (app chrome + mode switcher), practice.*,
// collection.*. Interpolated strings are typed as functions.
// PT-BR values pending native-speaker review before release.

import type { LocaleId } from '../domain/settings'
import type { SeededTagId } from '../domain/tags'

export interface UiStrings {
  readonly shell: {
    readonly appTitle: string
    readonly modeToggle: {
      readonly label: string
      readonly practiceName: string
      readonly collectionName: string
    }
  }
  readonly practice: {
    readonly placeholder: string
  }
  readonly collection: {
    readonly empty: string
    readonly loadError: string
    readonly importButton: string
    readonly importing: string
    readonly storageGauge: (used: string, total: string) => string
    readonly storageUsed: (used: string) => string
    readonly deleteLabel: string
    readonly deleteTitle: string
    readonly deleteBody: string
    readonly deleteConfirm: string
    readonly deleteCancel: string
    readonly deleteFailed: string
    readonly select: string
    readonly selectDone: string
    readonly selectedCount: (count: number) => string
    readonly rejection: {
      readonly unsupportedType: string
      readonly undecodable: string
      readonly undecodableVideo: string
      readonly encodeFailed: string
      readonly storageFailed: string
    }
  }
  readonly tags: {
    readonly seeded: Readonly<Record<SeededTagId, string>>
    readonly edit: string
    readonly empty: string
    readonly newTagPlaceholder: string
    readonly add: string
    readonly rename: string
    readonly save: string
    readonly cancel: string
    readonly delete: string
    readonly deleteTitle: string
    readonly deleteBody: string
    readonly deleteConfirm: string
    readonly actionFailed: string
  }
}

const EN: UiStrings = {
  shell: {
    appTitle: 'Cute Baby Meditation',
    modeToggle: {
      label: 'App mode',
      practiceName: 'Practice',
      collectionName: 'Collection',
    },
  },
  practice: {
    placeholder: 'The practice will live here.',
  },
  collection: {
    empty: 'Your collection is empty. Import photos or videos to begin.',
    loadError: 'Could not open the collection storage.',
    importButton: 'Import media',
    importing: 'Importing…',
    storageGauge: (used, total) => `Using ${used} of ${total}`,
    storageUsed: (used) => `Using ${used}`,
    deleteLabel: 'Delete',
    deleteTitle: 'Remove from collection?',
    deleteBody: 'The file is deleted from this device. Practice history is kept.',
    deleteConfirm: 'Delete',
    deleteCancel: 'Cancel',
    deleteFailed: 'Could not delete. Please try again.',
    select: 'Select',
    selectDone: 'Done',
    selectedCount: (count) => (count === 1 ? '1 selected' : `${String(count)} selected`),
    rejection: {
      unsupportedType: 'Not a supported image or video type.',
      undecodable: 'Could not read this image. Converting it to JPEG may help.',
      undecodableVideo: 'Could not play this video. Converting it to MP4 (H.264) may help.',
      encodeFailed: 'Could not process this image.',
      storageFailed: 'Could not save — device storage may be full.',
    },
  },
  tags: {
    seeded: {
      'seed:babies': 'Babies',
      'seed:kittens': 'Kittens',
      'seed:puppies': 'Puppies',
      'seed:family': 'Family',
      'seed:bhakti': 'Bhakti',
    },
    edit: 'Edit tags',
    empty: 'No tags yet.',
    newTagPlaceholder: 'New tag',
    add: 'Add',
    rename: 'Rename',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    deleteTitle: 'Delete this tag?',
    deleteBody: 'The tag is removed from all media. No photos or videos are deleted.',
    deleteConfirm: 'Delete',
    actionFailed: 'Could not update tags. Please try again.',
  },
}

const PT_BR: UiStrings = {
  shell: {
    appTitle: 'Cute Baby Meditation',
    modeToggle: {
      label: 'Modo do app',
      practiceName: 'Prática',
      collectionName: 'Coleção',
    },
  },
  practice: {
    placeholder: 'A prática vai morar aqui.',
  },
  collection: {
    empty: 'Sua coleção está vazia. Importe fotos ou vídeos para começar.',
    loadError: 'Não foi possível abrir o armazenamento da coleção.',
    importButton: 'Importar mídia',
    importing: 'Importando…',
    storageGauge: (used, total) => `Usando ${used} de ${total}`,
    storageUsed: (used) => `Usando ${used}`,
    deleteLabel: 'Excluir',
    deleteTitle: 'Remover da coleção?',
    deleteBody: 'O arquivo é apagado deste aparelho. O histórico de prática é mantido.',
    deleteConfirm: 'Excluir',
    deleteCancel: 'Cancelar',
    deleteFailed: 'Não foi possível excluir. Tente novamente.',
    select: 'Selecionar',
    selectDone: 'Concluir',
    selectedCount: (count) => (count === 1 ? '1 selecionado' : `${String(count)} selecionados`),
    rejection: {
      unsupportedType: 'Tipo de imagem ou vídeo não suportado.',
      undecodable: 'Não foi possível ler esta imagem. Converter para JPEG pode ajudar.',
      undecodableVideo: 'Não foi possível reproduzir este vídeo. Converter para MP4 (H.264) pode ajudar.',
      encodeFailed: 'Não foi possível processar esta imagem.',
      storageFailed: 'Não foi possível salvar — o armazenamento do aparelho pode estar cheio.',
    },
  },
  tags: {
    seeded: {
      'seed:babies': 'Bebês',
      'seed:kittens': 'Gatinhos',
      'seed:puppies': 'Filhotes',
      'seed:family': 'Família',
      'seed:bhakti': 'Bhakti',
    },
    edit: 'Editar tags',
    empty: 'Nenhuma tag ainda.',
    newTagPlaceholder: 'Nova tag',
    add: 'Adicionar',
    rename: 'Renomear',
    save: 'Salvar',
    cancel: 'Cancelar',
    delete: 'Excluir',
    deleteTitle: 'Excluir esta tag?',
    deleteBody: 'A tag é removida de todas as mídias. Nenhuma foto ou vídeo é excluído.',
    deleteConfirm: 'Excluir',
    actionFailed: 'Não foi possível atualizar as tags. Tente novamente.',
  },
}

export const UI_STRINGS: Record<LocaleId, UiStrings> = {
  en: EN,
  'pt-BR': PT_BR,
}
