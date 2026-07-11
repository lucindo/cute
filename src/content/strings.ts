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
    readonly rejection: {
      readonly unsupportedType: string
      readonly undecodable: string
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
    empty: 'Your collection is empty. Import photos to begin.',
    loadError: 'Could not open the collection storage.',
    importButton: 'Import photos',
    importing: 'Importing…',
    rejection: {
      unsupportedType: 'Not a supported image type.',
      undecodable: 'Could not read this image. Converting it to JPEG may help.',
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
    empty: 'Sua coleção está vazia. Importe fotos para começar.',
    loadError: 'Não foi possível abrir o armazenamento da coleção.',
    importButton: 'Importar fotos',
    importing: 'Importando…',
    rejection: {
      unsupportedType: 'Tipo de imagem não suportado.',
      undecodable: 'Não foi possível ler esta imagem. Converter para JPEG pode ajudar.',
      encodeFailed: 'Não foi possível processar esta imagem.',
      storageFailed: 'Não foi possível salvar — o armazenamento do aparelho pode estar cheio.',
    },
  },
}

export const UI_STRINGS: Record<LocaleId, UiStrings> = {
  en: EN,
  'pt-BR': PT_BR,
}
