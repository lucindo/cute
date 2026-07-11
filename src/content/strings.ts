// UI strings catalog — all UI strings live here, not inline in components.
// Sub-objects per surface: shell.* (app chrome + mode switcher), practice.*,
// collection.*. Interpolated strings are typed as functions.
// PT-BR values pending native-speaker review before release.

import type { LocaleId } from '../domain/settings'

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
    readonly deleteLabel: string
    readonly deleteTitle: string
    readonly deleteBody: string
    readonly deleteConfirm: string
    readonly deleteCancel: string
    readonly deleteFailed: string
    readonly rejection: {
      readonly unsupportedType: string
      readonly undecodable: string
      readonly undecodableVideo: string
      readonly encodeFailed: string
      readonly storageFailed: string
    }
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
    deleteLabel: 'Delete',
    deleteTitle: 'Remove from collection?',
    deleteBody: 'The file is deleted from this device. Practice history is kept.',
    deleteConfirm: 'Delete',
    deleteCancel: 'Cancel',
    deleteFailed: 'Could not delete. Please try again.',
    rejection: {
      unsupportedType: 'Not a supported image or video type.',
      undecodable: 'Could not read this image. Converting it to JPEG may help.',
      undecodableVideo: 'Could not play this video. Converting it to MP4 (H.264) may help.',
      encodeFailed: 'Could not process this image.',
      storageFailed: 'Could not save — device storage may be full.',
    },
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
    deleteLabel: 'Excluir',
    deleteTitle: 'Remover da coleção?',
    deleteBody: 'O arquivo é apagado deste aparelho. O histórico de prática é mantido.',
    deleteConfirm: 'Excluir',
    deleteCancel: 'Cancelar',
    deleteFailed: 'Não foi possível excluir. Tente novamente.',
    rejection: {
      unsupportedType: 'Tipo de imagem ou vídeo não suportado.',
      undecodable: 'Não foi possível ler esta imagem. Converter para JPEG pode ajudar.',
      undecodableVideo: 'Não foi possível reproduzir este vídeo. Converter para MP4 (H.264) pode ajudar.',
      encodeFailed: 'Não foi possível processar esta imagem.',
      storageFailed: 'Não foi possível salvar — o armazenamento do aparelho pode estar cheio.',
    },
  },
}

export const UI_STRINGS: Record<LocaleId, UiStrings> = {
  en: EN,
  'pt-BR': PT_BR,
}
