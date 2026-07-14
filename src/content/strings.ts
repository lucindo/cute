// UI strings catalog — all UI strings live here, not inline in components.
// One sub-object per surface (shell, practice, session, …); interpolated
// strings are typed as functions.

import type { LocaleId, ThemeId } from '../domain/settings'
import type { SeededTagId } from '../domain/tags'

export interface UiStrings {
  readonly shell: {
    readonly appTitle: string
    readonly settings: string
    readonly modeToggle: {
      readonly label: string
      readonly practiceName: string
      readonly collectionName: string
    }
  }
  readonly practice: {
    readonly duration: string
    readonly minUnit: string
    readonly stepper: {
      readonly decrease: string
      readonly increase: string
    }
    readonly filter: {
      readonly label: string
      readonly allHint: string
    }
    readonly start: string
    readonly emptyCollection: string
    readonly emptyFilter: string
  }
  readonly session: {
    readonly stop: string
    readonly stopTitle: string
    readonly stopConfirm: string
    readonly stopCancel: string
    readonly mute: string
    readonly unmute: string
    readonly completion: {
      readonly title: string
      readonly duration: string
      readonly holds: string
      readonly totalHeld: string
      readonly longest: string
      readonly done: string
    }
  }
  readonly collection: {
    readonly empty: string
    readonly loadError: string
    readonly importButton: string
    readonly importing: string
    readonly storageGauge: (used: string, total: string) => string
    readonly storageUsed: (used: string) => string
    readonly sortLabel: string
    readonly sortRecent: string
    readonly sortAww: string
    // Per-card lifetime hold stats: count + total held time (FR-17).
    readonly holdStat: (count: number, held: string) => string
    readonly deleteLabel: string
    readonly deleteTitle: string
    readonly deleteBody: string
    readonly deleteConfirm: string
    readonly deleteCancel: string
    readonly deleteFailed: string
    readonly openItem: string
    readonly close: string
    readonly save: string
    readonly saveFailed: string
    readonly discardTitle: string
    readonly discardBody: string
    readonly discardConfirm: string
    readonly discardCancel: string
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
  readonly settings: {
    readonly title: string
    readonly back: string
    readonly statistics: {
      readonly label: string
      readonly open: string
    }
    readonly theme: {
      readonly label: string
      readonly options: Readonly<Record<ThemeId, string>>
    }
    readonly language: {
      readonly label: string
    }
    readonly about: {
      readonly label: string
      readonly version: string
      readonly source: string
    }
    readonly backup: {
      readonly label: string
      readonly export: string
      readonly restore: string
      readonly working: string
      readonly restoreTitle: string
      readonly restoreBody: string
      readonly restoreConfirm: string
      readonly restoreCancel: string
      readonly invalidFile: string
      readonly error: string
    }
  }
  readonly stats: {
    readonly title: string
    readonly back: string
    readonly sessions: string
    readonly practiceTime: string
    readonly totalHeld: string
    readonly longest: string
    readonly recent: string
    // Keyed by SessionRecord.endReason; a new reason would fail the lookup.
    readonly endReason: Readonly<Record<'completed' | 'stopped', string>>
    readonly sessionMeta: (duration: string, holds: number) => string
    readonly empty: string
    readonly loadError: string
  }
  readonly learn: {
    readonly title: string
    readonly close: string
    readonly videosHeading: string
    readonly resourcesHeading: string
  }
}

const EN: UiStrings = {
  shell: {
    appTitle: 'Cute Baby Meditation',
    settings: 'Settings',
    modeToggle: {
      label: 'App mode',
      practiceName: 'Practice',
      collectionName: 'Collection',
    },
  },
  practice: {
    duration: 'Duration',
    minUnit: 'min',
    stepper: {
      decrease: 'Decrease',
      increase: 'Increase',
    },
    filter: {
      label: 'Filter by tag',
      allHint: 'All sources',
    },
    start: 'Start',
    emptyCollection: 'Your collection is empty. Add photos or videos in the Collection to begin.',
    emptyFilter: 'No sources match the selected tags.',
  },
  session: {
    stop: 'Stop',
    stopTitle: 'Stop this session?',
    stopConfirm: 'Stop',
    stopCancel: 'Keep going',
    mute: 'Mute',
    unmute: 'Unmute',
    completion: {
      title: 'Session complete',
      duration: 'Duration',
      holds: 'Holds',
      totalHeld: 'Total held',
      longest: 'Longest hold',
      done: 'Done',
    },
  },
  collection: {
    empty: 'Your collection is empty. Import photos or videos to begin.',
    loadError: 'Could not open the collection storage.',
    importButton: 'Import media',
    importing: 'Importing…',
    storageGauge: (used, total) => `Using ${used} of ${total}`,
    storageUsed: (used) => `Using ${used}`,
    sortLabel: 'Sort',
    sortRecent: 'Recent',
    sortAww: 'Aww',
    holdStat: (count, held) => `♥ ${String(count)} · ${held}`,
    deleteLabel: 'Delete',
    deleteTitle: 'Remove from collection?',
    deleteBody: 'The file is deleted from this device. Practice history is kept.',
    deleteConfirm: 'Delete',
    deleteCancel: 'Cancel',
    deleteFailed: 'Could not delete. Please try again.',
    openItem: 'Open item',
    close: 'Close',
    save: 'Save',
    saveFailed: 'Could not save your changes. Please try again.',
    discardTitle: 'Discard changes?',
    discardBody: 'Your edits to this item will be lost.',
    discardConfirm: 'Discard',
    discardCancel: 'Keep editing',
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
  settings: {
    title: 'Settings',
    back: 'Back',
    statistics: {
      label: 'Statistics',
      open: 'View statistics',
    },
    theme: {
      label: 'Theme',
      options: { light: 'Light', dark: 'Dark', system: 'System' },
    },
    language: {
      label: 'Language',
    },
    about: {
      label: 'About',
      version: 'Version',
      source: 'Source',
    },
    backup: {
      label: 'Backup',
      export: 'Export backup',
      restore: 'Restore backup',
      working: 'Working…',
      restoreTitle: 'Replace everything?',
      restoreBody:
        'Restoring replaces all current photos, videos, tags, and practice history with the backup’s contents. This cannot be undone.',
      restoreConfirm: 'Replace',
      restoreCancel: 'Cancel',
      invalidFile: 'That file isn’t a valid backup. Nothing was changed.',
      error: 'Something went wrong. Please try again.',
    },
  },
  stats: {
    title: 'Statistics',
    back: 'Back',
    sessions: 'Sessions',
    practiceTime: 'Practice time',
    totalHeld: 'Total held',
    longest: 'Longest hold',
    recent: 'Recent sessions',
    endReason: { completed: 'Completed', stopped: 'Stopped' },
    sessionMeta: (duration, holds) => `${duration} · ♥ ${String(holds)}`,
    empty: 'No sessions yet. Your practice history will appear here.',
    loadError: 'Could not open your practice history.',
  },
  learn: {
    title: 'About this practice',
    close: 'Close',
    videosHeading: 'Cute Baby Meditation Videos',
    resourcesHeading: 'Forrest Knutson Resources',
  },
}

const PT_BR: UiStrings = {
  shell: {
    appTitle: 'Meditação do Bebê Fofo',
    settings: 'Configurações',
    modeToggle: {
      label: 'Modo do app',
      practiceName: 'Prática',
      collectionName: 'Coleção',
    },
  },
  practice: {
    duration: 'Duração',
    minUnit: 'min',
    stepper: {
      decrease: 'Diminuir',
      increase: 'Aumentar',
    },
    filter: {
      label: 'Filtrar por tag',
      allHint: 'Todas as mídias',
    },
    start: 'Começar',
    emptyCollection: 'Sua coleção está vazia. Adicione fotos ou vídeos na Coleção para começar.',
    emptyFilter: 'Nenhuma mídia corresponde às tags selecionadas.',
  },
  session: {
    stop: 'Parar',
    stopTitle: 'Parar esta sessão?',
    stopConfirm: 'Parar',
    stopCancel: 'Continuar',
    mute: 'Silenciar',
    unmute: 'Ativar som',
    completion: {
      title: 'Sessão concluída',
      duration: 'Duração',
      holds: 'Retenções',
      totalHeld: 'Tempo total retido',
      longest: 'Maior retenção',
      done: 'Concluir',
    },
  },
  collection: {
    empty: 'Sua coleção está vazia. Importe fotos ou vídeos para começar.',
    loadError: 'Não foi possível abrir o armazenamento da coleção.',
    importButton: 'Importar mídia',
    importing: 'Importando…',
    storageGauge: (used, total) => `Usando ${used} de ${total}`,
    storageUsed: (used) => `Usando ${used}`,
    sortLabel: 'Ordenar',
    sortRecent: 'Recentes',
    sortAww: 'Aww',
    holdStat: (count, held) => `♥ ${String(count)} · ${held}`,
    deleteLabel: 'Excluir',
    deleteTitle: 'Remover da coleção?',
    deleteBody: 'O arquivo é apagado deste aparelho. O histórico de prática é mantido.',
    deleteConfirm: 'Excluir',
    deleteCancel: 'Cancelar',
    deleteFailed: 'Não foi possível excluir. Tente novamente.',
    openItem: 'Abrir item',
    close: 'Fechar',
    save: 'Salvar',
    saveFailed: 'Não foi possível salvar suas alterações. Tente novamente.',
    discardTitle: 'Descartar alterações?',
    discardBody: 'Suas edições neste item serão perdidas.',
    discardConfirm: 'Descartar',
    discardCancel: 'Continuar editando',
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
      'seed:puppies': 'Cachorrinhos',
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
  settings: {
    title: 'Configurações',
    back: 'Voltar',
    statistics: {
      label: 'Estatísticas',
      open: 'Ver estatísticas',
    },
    theme: {
      label: 'Tema',
      options: { light: 'Claro', dark: 'Escuro', system: 'Sistema' },
    },
    language: {
      label: 'Idioma',
    },
    about: {
      label: 'Sobre',
      version: 'Versão',
      source: 'Código-fonte',
    },
    backup: {
      label: 'Backup',
      export: 'Exportar backup',
      restore: 'Restaurar backup',
      working: 'Processando…',
      restoreTitle: 'Substituir tudo?',
      restoreBody:
        'Restaurar substitui todas as fotos, vídeos, tags e histórico de prática atuais pelo conteúdo do backup. Isso não pode ser desfeito.',
      restoreConfirm: 'Substituir',
      restoreCancel: 'Cancelar',
      invalidFile: 'Esse arquivo não é um backup válido. Nada foi alterado.',
      error: 'Algo deu errado. Tente novamente.',
    },
  },
  stats: {
    title: 'Estatísticas',
    back: 'Voltar',
    sessions: 'Sessões',
    practiceTime: 'Tempo de prática',
    totalHeld: 'Tempo total retido',
    longest: 'Maior retenção',
    recent: 'Sessões recentes',
    endReason: { completed: 'Concluída', stopped: 'Parada' },
    sessionMeta: (duration, holds) => `${duration} · ♥ ${String(holds)}`,
    empty: 'Nenhuma sessão ainda. Seu histórico de prática aparecerá aqui.',
    loadError: 'Não foi possível abrir seu histórico de prática.',
  },
  learn: {
    title: 'Sobre esta prática',
    close: 'Fechar',
    videosHeading: 'Vídeos da Meditação do Bebê Fofo',
    resourcesHeading: 'Recursos do Forrest Knutson',
  },
}

export const UI_STRINGS: Record<LocaleId, UiStrings> = {
  en: EN,
  'pt-BR': PT_BR,
}
