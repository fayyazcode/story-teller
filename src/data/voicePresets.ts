import type { VoicePreset } from '../types/storyboard';

export const VOICE_PRESETS: VoicePreset[] = [
  {
    id: 'deep-mysterious',
    label: 'Mysterious & Atmospheric (Default)',
    voiceName: 'Charon',
    style:
      'Confident and clear, deep pitch. Mysterious, serious, and atmospheric documentary storytelling with slow, natural pacing and dramatic pauses.',
    summary:
      'Deep pitch, mysterious and serious gravity with slow, unhurried documentary cadence.',
  },
  {
    id: 'gravelly-maritime',
    label: 'Somber Maritime Baritone',
    voiceName: 'Fenrir',
    style:
      'Confident and clear, deep baritone pitch. Serious, atmospheric, and brooding storytelling with slow deliberate pacing and weighty dramatic pauses.',
    summary:
      'Low resonant baritone suited to Atlantic storm passages and western landing scenes.',
  },
  {
    id: 'archival-investigator',
    label: 'Serious Archival Chronicler',
    voiceName: 'Kore',
    style:
      'Clear, serious, and atmospheric documentary narration. Measured slow pacing, understated tension, and natural dramatic pauses.',
    summary:
      'Measured investigative clarity for official inquiry records and evidence comparisons.',
  },
  {
    id: 'measured-narrator',
    label: 'Quiet Suspense Narrator',
    voiceName: 'Puck',
    style:
      'Confident and clear, low-key serious tone. Slow, atmospheric storytelling with controlled pauses and restrained suspense.',
    summary:
      'Restrained, grounded delivery designed to sit cleanly beneath subtle score drones.',
  },
  {
    id: 'quiet-epilogue',
    label: 'Haunting Closing Voice',
    voiceName: 'Zephyr',
    style:
      'Slow, quiet, mysterious, and atmospheric storytelling voice with gentle breath, serious reflection, and lingering dramatic pauses.',
    summary:
      'Quiet reflective register suited to final mysteries and closing titles.',
  },
];

export const DEFAULT_VOICE_PRESET = VOICE_PRESETS[0];
