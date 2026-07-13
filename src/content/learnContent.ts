// Translatable Learn/About content (EN + PT-BR). The practice copy is original —
// it explains the same practice as Forrest Knutson's book without reusing his
// wording. Forrest's bio, the resource links, and the reference videos are his.
// Claim-safe footer lines live in ./lockedCopy.ts, composed by LearnPanel.

import type { LocaleId } from '../domain/settings'

export interface LearnSection {
  readonly title: string
  readonly body: string
}

export interface LearnLink {
  readonly label: string
  readonly url: string
}

export interface LearnContent {
  // How the practice works and how a session runs it — the two explainer cards.
  readonly description: {
    readonly section1: LearnSection
    readonly section2: LearnSection
  }
  // Note under "How a session works": unmuted video interrupts background audio.
  readonly videoNote: string
  // Forrest's reference videos for this practice.
  readonly videos: readonly LearnLink[]
  readonly forrest: LearnSection
  readonly links: {
    readonly youtubeChannel: LearnLink
    readonly website: LearnLink
    readonly book: LearnLink
    readonly patreon: LearnLink
  }
}

export const LEARN_CONTENT: Readonly<Record<LocaleId, LearnContent>> = {
  en: {
    description: {
      section1: {
        title: 'What is the Cute Baby Meditation',
        body: 'The Cute Baby Meditation is a form of Mettā — loving-kindness — practice with roots in the Visuddhimagga, a classical Buddhist text. Rather than repeating phrases, you let something irresistibly cute — a baby, a kitten, a puppy — spark an immediate warmth, and you rest your attention on that feeling. It is a quiet, self-directed practice: a few minutes of gazing and feeling, not a lesson or a measurement.',
      },
      section2: {
        title: 'How a session works',
        body: "Choose how long you would like to practice and press Start. The app shows one photo or video from your collection at a time, full-screen and free of distractions. When a picture gives you that “aww”, press and hold — the app quietly times how long the feeling lasts. Let go when it fades, clear your mind, and hold again, or swipe on to the next image. When your time is up, you'll see a short summary: how long you practiced, how many times you held the feeling, and your longest hold.",
      },
    },
    videoNote:
      "If a video has sound, playing it will pause any music or podcast running in the background — that's how iOS manages audio, and the app can't change it.",
    videos: [
      {
        label: 'Cute Baby Meditation = Instant Metta Practice',
        url: 'https://www.youtube.com/watch?v=RzrjwaN2uz0',
      },
      {
        label: 'Cute Baby Meditation Into Bhakti Yoga',
        url: 'https://www.youtube.com/watch?v=upxuMuLgu00',
      },
      {
        label: 'My Cute Baby & Angel Exercise Story',
        url: 'https://www.youtube.com/watch?v=AHwroQ186sE',
      },
    ],
    forrest: {
      title: 'Who is Forrest Knutson',
      body: 'Forrest Knutson is a Kriya Yoga guru, meditation teacher, author, and online educator best known for simplifying ancient yogic and contemplative practices for modern audiences. Through his videos and teachings, he explains techniques related to breathwork, meditation, nervous system regulation, and spiritual development. His work is appreciated for combining practical instruction with clear, science-informed explanations that make complex spiritual concepts more accessible.',
    },
    links: {
      youtubeChannel: {
        label: 'YouTube channel',
        url: 'https://www.youtube.com/@ForrestKnutson',
      },
      website: {
        label: 'Website/Trainings',
        url: 'https://www.meditativemellows.com/',
      },
      book: {
        label: '"Mastering Meditation" book',
        url: 'https://www.amazon.com/Mastering-Meditation-Eight-Steps-Beginner-ebook/dp/B0CCFWP4W8?sr=8-1&linkId=1a5a2958fc89bdb6769b54d0bc9a4d17&language=en_US',
      },
      patreon: {
        label: 'Patreon',
        url: 'https://www.patreon.com/forrestknutson',
      },
    },
  },
  'pt-BR': {
    description: {
      section1: {
        title: 'O que é a Cute Baby Meditation',
        body: 'A Cute Baby Meditation é uma forma de prática de Mettā — bondade amorosa — com raízes no Visuddhimagga, um texto budista clássico. Em vez de repetir frases, você deixa que algo irresistivelmente fofo — um bebê, um gatinho, um cachorrinho — desperte um calor imediato, e mantém sua atenção nesse sentimento. É uma prática silenciosa e autodirigida: alguns minutos de contemplação e sentimento, não uma lição nem uma medição.',
      },
      section2: {
        title: 'Como funciona uma sessão',
        body: 'Escolha por quanto tempo deseja praticar e toque em Iniciar. O app mostra uma foto ou vídeo da sua coleção por vez, em tela cheia e livre de distrações. Quando uma imagem lhe der aquele “aww”, pressione e segure — o app cronometra silenciosamente quanto tempo o sentimento dura. Solte quando ele se dissipar, limpe a mente e segure de novo, ou deslize para a próxima imagem. Quando o tempo acabar, você verá um breve resumo: quanto tempo praticou, quantas vezes segurou o sentimento e a sua retenção mais longa.',
      },
    },
    videoNote:
      'Se um vídeo tiver som, reproduzi-lo vai pausar qualquer música ou podcast tocando em segundo plano — é assim que o iOS gerencia o áudio, e o app não pode mudar isso.',
    videos: [
      // Video titles kept in English — YouTube source is English; no PT-BR title.
      {
        label: 'Cute Baby Meditation = Instant Metta Practice',
        url: 'https://www.youtube.com/watch?v=RzrjwaN2uz0',
      },
      {
        label: 'Cute Baby Meditation Into Bhakti Yoga',
        url: 'https://www.youtube.com/watch?v=upxuMuLgu00',
      },
      {
        label: 'My Cute Baby & Angel Exercise Story',
        url: 'https://www.youtube.com/watch?v=AHwroQ186sE',
      },
    ],
    forrest: {
      title: 'Quem é Forrest Knutson',
      body: 'Forrest Knutson é um guru de Kriya Yoga, professor de meditação, autor e educador online, reconhecido por tornar práticas yóguicas e contemplativas milenares acessíveis ao público moderno. Por meio de seus vídeos e ensinamentos, ele explica técnicas de respiração, meditação, regulação do sistema nervoso e desenvolvimento espiritual. Seu trabalho é valorizado pela combinação de instrução prática com explicações claras e embasadas na ciência, tornando conceitos espirituais complexos mais compreensíveis.',
    },
    links: {
      youtubeChannel: {
        label: 'Canal do YouTube',
        url: 'https://www.youtube.com/@ForrestKnutson',
      },
      website: {
        label: 'Site/Treinamentos',
        url: 'https://www.meditativemellows.com/',
      },
      book: {
        label: 'Livro "Mastering Meditation"',
        url: 'https://www.amazon.com/Mastering-Meditation-Eight-Steps-Beginner-ebook/dp/B0CCFWP4W8?sr=8-1&linkId=1a5a2958fc89bdb6769b54d0bc9a4d17&language=en_US',
      },
      patreon: {
        label: 'Patreon',
        url: 'https://www.patreon.com/forrestknutson',
      },
    },
  },
} as const satisfies Readonly<Record<LocaleId, LearnContent>>
