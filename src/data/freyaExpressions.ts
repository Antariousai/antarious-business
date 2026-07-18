import { freyaBase } from './freyaAssets'

/** Login-page expression states for Freya — canonical folded pose. */
export type FreyaLoginMood = 'welcome' | 'listening' | 'thinking' | 'excited' | 'wave'

const still = freyaBase

export const FREYA_LOGIN_MOODS: Record<
  FreyaLoginMood,
  { src: string; poster: string; label: string }
> = {
  welcome: {
    src: still,
    poster: still,
    label: 'Warm welcome',
  },
  listening: {
    src: still,
    poster: still,
    label: 'Listening',
  },
  thinking: {
    src: still,
    poster: still,
    label: 'Thinking',
  },
  excited: {
    src: still,
    poster: still,
    label: 'Excited',
  },
  wave: {
    src: still,
    poster: still,
    label: 'Waving goodbye',
  },
}
