export type TruthCategory =
  | 'established'
  | 'reconstruction'
  | 'legend';

export type PrebuiltVoiceName =
  | 'Charon'
  | 'Fenrir'
  | 'Puck'
  | 'Kore'
  | 'Zephyr';

export interface PauseMarker {
  label: string;
  seconds: number;
}

export interface Shot {
  id: string;
  chapterNumber: number;
  timecode: string;
  durationSeconds: number;
  narration: string;
  visual: string;
  camera: string;
  transition: string;
  audio: string;
  truthCategory: TruthCategory;
  pauses: PauseMarker[];
  wordCount: number;
}

export interface Chapter {
  number: number;
  title: string;
  editorialWindow: string;
  declaredShots: number;
  narrationWords: number;
  shots: Shot[];
}

export interface SoundEditKeyItem {
  code: string;
  description: string;
}

export type StoryFormat = 'storyboard' | 'narrative';

export interface StorySummary {
  id: string;
  filename: string;
  seriesTitle: string;
  episodeTitle: string;
  subtitle: string;
  targetEdit: string;
  chaptersCount: number;
  totalShots: number;
  totalWords: number;
  format: StoryFormat;
  updatedAt: string;
  isBuiltIn: boolean;
}

export interface StoryboardData {
  id: string;
  format: StoryFormat;
  seriesTitle: string;
  subtitle: string;
  episodeTitle: string;
  source: string;
  targetEdit: string;
  narrationPolicy: string;
  timingNote: string;
  visualTruthPolicy: string;
  soundEditKey: SoundEditKeyItem[];
  chapters: Chapter[];
  checklist: string[];
  totalShots: number;
  totalWords: number;
}

export interface VoicePreset {
  id: string;
  label: string;
  voiceName: PrebuiltVoiceName;
  style: string;
  summary: string;
}

export interface SynthesizedTake {
  id: string;
  label: string;
  text: string;
  voiceName: PrebuiltVoiceName;
  style: string;
  audioUrl: string;
  blob: Blob;
  durationSeconds: number;
  createdAt: number;
}
