import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import type {
  Chapter,
  PauseMarker,
  PrebuiltVoiceName,
  Shot,
  SoundEditKeyItem,
  StoryboardData,
  StoryFormat,
  StorySummary,
  TruthCategory,
} from './src/types/storyboard.ts';

const PORT = 3000;
const SEED_STORYBOARD_RELATIVE_PATH =
  'public/assets/aistudio/Flannan_Isles_Complete_Storyboard_715c75ed.md';
const STORIES_DIR = path.resolve(process.cwd(), 'public/stories');
const BUILT_IN_STORY_ID = 'flannan-isles-episode-01';

const VALID_VOICES: ReadonlySet<PrebuiltVoiceName> = new Set([
  'Charon',
  'Fenrir',
  'Puck',
  'Kore',
  'Zephyr',
]);

const DEFAULT_STYLE =
  'Confident and clear, deep pitch. Mysterious, serious, and atmospheric documentary storytelling with slow, natural pacing and dramatic pauses.';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please verify your API key in Settings > Secrets.',
    );
  }
  return new GoogleGenAI({
    apiKey,
    apiVersion: 'v1beta',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function classifyTruthCategory(
  visual: string,
  narration: string,
): TruthCategory {
  const combined = `${visual} ${narration}`.toLowerCase();
  if (
    combined.includes('legend') ||
    combined.includes('unsupported') ||
    combined.includes('not supported') ||
    combined.includes('unverified') ||
    combined.includes('sensational logbook') ||
    combined.includes('imagined')
  ) {
    return 'legend';
  }
  if (
    combined.includes('reconstruction') ||
    combined.includes('hypothetical') ||
    combined.includes('alternative reconstruction') ||
    combined.includes('dramatic') ||
    combined.includes('period-style portrait')
  ) {
    return 'reconstruction';
  }
  return 'established';
}

function extractPauses(text: string): PauseMarker[] {
  const pauses: PauseMarker[] = [];
  const regex = /\[PAUSE(?:\s*-\s*(\d+)\s*SECONDS?)?\]/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const seconds = match[1] ? Number.parseInt(match[1], 10) : 1.5;
    pauses.push({
      label: match[0],
      seconds: Number.isFinite(seconds) ? seconds : 1.5,
    });
  }
  return pauses;
}

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function cleanNarrativeMarkdown(raw: string): string {
  return raw
    .replace(/^>\s?/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseNarrativeMarkdown(
  markdown: string,
  id: string,
  fallbackTitle: string,
): StoryboardData {
  const lines = markdown.split(/\r?\n/);
  let episodeTitle = fallbackTitle;
  let seriesTitle = 'EMBER & ECHO — STORY ARCHIVE';
  let subtitle = 'Markdown narrative manuscript';
  let source = `${id}.md`;

  const rawChapters: { title: string; paragraphs: string[] }[] = [];
  let currentChapter: { title: string; paragraphs: string[] } | null = null;
  let paragraphBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return;
    const joined = cleanNarrativeMarkdown(paragraphBuffer.join(' '));
    paragraphBuffer = [];
    if (!joined) return;
    if (!currentChapter) {
      currentChapter = { title: 'Opening', paragraphs: [] };
      rawChapters.push(currentChapter);
    }
    currentChapter.paragraphs.push(joined);
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      flushParagraph();
      continue;
    }

    if (trimmed.startsWith('# ')) {
      flushParagraph();
      const heading = trimmed.slice(2).trim();
      if (episodeTitle === fallbackTitle) {
        episodeTitle = heading;
      } else {
        seriesTitle = episodeTitle;
        episodeTitle = heading;
      }
      continue;
    }

    if (trimmed.startsWith('## ')) {
      flushParagraph();
      const chHeading = trimmed
        .slice(3)
        .trim()
        .replace(/^Chapter\s+\d+\s*[—:-]?\s*/i, '');
      currentChapter = {
        title: chHeading || `Chapter ${rawChapters.length + 1}`,
        paragraphs: [],
      };
      rawChapters.push(currentChapter);
      continue;
    }

    if (trimmed.startsWith('### ')) {
      flushParagraph();
      const subHeading = trimmed.slice(4).trim();
      if (!currentChapter) {
        currentChapter = { title: subHeading, paragraphs: [] };
        rawChapters.push(currentChapter);
      } else if (currentChapter.paragraphs.length > 0) {
        currentChapter = { title: subHeading, paragraphs: [] };
        rawChapters.push(currentChapter);
      } else {
        subtitle = subHeading;
      }
      continue;
    }

    if (/^[-*_]{3,}$/.test(trimmed)) {
      flushParagraph();
      continue;
    }

    if (trimmed.startsWith('**Subtitle:**') || trimmed.startsWith('**Tagline:**')) {
      subtitle = trimmed.replace(/^\*\*[^:]+:\*\*\s*/, '').trim();
      continue;
    }
    if (trimmed.startsWith('**Author:**') || trimmed.startsWith('**Source:**')) {
      source = trimmed.replace(/^\*\*[^:]+:\*\*\s*/, '').trim();
      continue;
    }

    const cleanBullet = trimmed.replace(/^[-*+]\s+/, '');
    paragraphBuffer.push(cleanBullet);
  }
  flushParagraph();

  const nonEmptyChapters = rawChapters.filter((ch) => ch.paragraphs.length > 0);
  const chapters: Chapter[] = [];
  let timelineCursor = 0;

  nonEmptyChapters.forEach((ch, chIdx) => {
    const chNum = chIdx + 1;
    const chStart = timelineCursor;
    const shots: Shot[] = [];
    let chWords = 0;

    ch.paragraphs.forEach((para, pIdx) => {
      const pauses = extractPauses(para);
      const pauseSec = pauses.reduce((sum, p) => sum + p.seconds, 0);
      const wordCount = para
        .replace(/\[PAUSE[^\]]*\]/gi, '')
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
      chWords += wordCount;
      const dur = Math.max(4, Math.round(wordCount / 2.2 + pauseSec));
      const startSec = timelineCursor;
      const endSec = startSec + dur;
      timelineCursor = endSec;

      shots.push({
        id: `${String(chNum).padStart(2, '0')}.${String(pIdx + 1).padStart(2, '0')}`,
        chapterNumber: chNum,
        timecode: `${formatClock(startSec)}–${formatClock(endSec)}`,
        durationSeconds: dur,
        narration: para,
        visual: `Narrative beat ${pIdx + 1} of ${ch.title}.`,
        camera: 'Measured documentary pacing, atmospheric framing.',
        transition: pIdx === 0 ? 'Soft fade in from chapter title.' : '8–16 frame dissolve.',
        audio: 'Deep atmospheric underscore with natural room tone.',
        truthCategory: 'established',
        pauses,
        wordCount,
      });
    });

    chapters.push({
      number: chNum,
      title: ch.title,
      editorialWindow: `${formatClock(chStart)}–${formatClock(timelineCursor)}`,
      declaredShots: shots.length,
      narrationWords: chWords,
      shots,
    });
  });

  const totalShots = chapters.reduce((acc, c) => acc + c.shots.length, 0);
  const totalWords = chapters.reduce((acc, c) => acc + c.narrationWords, 0);

  return {
    id,
    format: 'narrative',
    seriesTitle,
    subtitle,
    episodeTitle,
    source,
    targetEdit: `${formatClock(timelineCursor)} estimated · 16:9 · 24 fps`,
    narrationPolicy: 'Read directly from uploaded Markdown manuscript; scripted [PAUSE] markers preserved.',
    timingNote: 'Timing estimated at ~130 WPM slow documentary cadence plus explicit pause cues.',
    visualTruthPolicy: 'Narrative manuscript loaded from Ember & Echo Markdown library.',
    soundEditKey: [
      { code: 'AMB', description: 'Atmospheric wind, distant surf, and low room tone matched to scene mood.' },
      { code: 'MUS', description: 'Restrained low drones and sparse strings; leave headroom for deep vocal clarity.' },
      { code: 'SFX', description: 'Subtle diegetic sound cues placed cleanly between spoken sentences.' },
    ],
    chapters,
    checklist: [
      'Confirm opening title and chapter headings match the source Markdown.',
      'Audition deep-pitch vocal cadence and dramatic [PAUSE] intervals.',
      'Export 48kHz YouTube WAV master and synchronized .srt captions for timeline editing.',
    ],
    totalShots,
    totalWords,
  };
}

function parseStoryMarkdown(
  markdown: string,
  id: string,
  fallbackTitle: string,
): StoryboardData {
  const hasStoryboardShots = /^### Shot \d+\.\d+/m.test(markdown);
  if (!hasStoryboardShots) {
    return parseNarrativeMarkdown(markdown, id, fallbackTitle);
  }

  const lines = markdown.split(/\r?\n/);

  let seriesTitle = fallbackTitle;
  let subtitle = 'Complete scene-by-scene production storyboard';
  let episodeTitle = fallbackTitle;
  let source = `${id}.md`;
  let targetEdit = '';
  let narrationPolicy = '';
  let timingNote = '';
  let visualTruthPolicy = '';

  const soundEditKey: SoundEditKeyItem[] = [];
  const chapters: Chapter[] = [];
  const checklist: string[] = [];

  let section: 'header' | 'sound_key' | 'chapter' | 'checklist' = 'header';
  let currentChapter: Chapter | null = null;
  let currentShot: Shot | null = null;

  const commitShot = () => {
    if (currentShot && currentChapter) {
      currentShot.truthCategory = classifyTruthCategory(
        currentShot.visual,
        currentShot.narration,
      );
      currentShot.pauses = extractPauses(currentShot.narration);
      const cleanWords = currentShot.narration
        .replace(/\[PAUSE[^\]]*\]/gi, '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      currentShot.wordCount = cleanWords.length;
      currentChapter.shots.push(currentShot);
      currentShot = null;
    }
  };

  const commitChapter = () => {
    commitShot();
    if (currentChapter) {
      chapters.push(currentChapter);
      currentChapter = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('# ')) {
      seriesTitle = line.slice(2).trim();
      continue;
    }

    if (line === '## Sound and edit key') {
      commitChapter();
      section = 'sound_key';
      continue;
    }

    if (line === '## Editorial accuracy checklist') {
      commitChapter();
      section = 'checklist';
      continue;
    }

    const chapterMatch = line.match(/^## Chapter (\d+)\s+[—-]\s+(.+)$/);
    if (chapterMatch) {
      commitChapter();
      section = 'chapter';
      currentChapter = {
        number: Number.parseInt(chapterMatch[1], 10),
        title: chapterMatch[2].trim(),
        editorialWindow: '',
        declaredShots: 0,
        narrationWords: 0,
        shots: [],
      };
      continue;
    }

    if (section === 'header') {
      if (line.startsWith('## ')) {
        subtitle = line.slice(3).trim();
      } else if (line.startsWith('**Title:**')) {
        episodeTitle = line.replace('**Title:**', '').trim();
      } else if (line.startsWith('**Source:**')) {
        source = line.replace('**Source:**', '').trim();
      } else if (line.startsWith('**Target edit:**')) {
        targetEdit = line.replace('**Target edit:**', '').trim();
      } else if (line.startsWith('**Narration policy:**')) {
        narrationPolicy = line.replace('**Narration policy:**', '').trim();
      } else if (line.startsWith('**Timing:**')) {
        timingNote = line.replace('**Timing:**', '').trim();
      } else if (line.startsWith('**Visual truth:**')) {
        visualTruthPolicy = line.replace('**Visual truth:**', '').trim();
      }
      continue;
    }

    if (section === 'sound_key') {
      const keyMatch = line.match(/^-\s+\*\*([^:*]+):\*\*\s+(.+)$/);
      if (keyMatch) {
        soundEditKey.push({
          code: keyMatch[1].trim(),
          description: keyMatch[2].trim(),
        });
      }
      continue;
    }

    if (section === 'checklist') {
      if (line.startsWith('- ')) {
        checklist.push(line.slice(2).trim());
      }
      continue;
    }

    if (section === 'chapter' && currentChapter) {
      const windowMatch = line.match(
        /^\*\*Editorial window:\*\*\s*([^|]+)\|\s*\*\*Shots:\*\*\s*(\d+)\s*\|\s*\*\*Narration words:\*\*\s*(\d+)/,
      );
      if (windowMatch) {
        currentChapter.editorialWindow = windowMatch[1].trim();
        currentChapter.declaredShots = Number.parseInt(windowMatch[2], 10);
        currentChapter.narrationWords = Number.parseInt(windowMatch[3], 10);
        continue;
      }

      const shotHeaderMatch = line.match(
        /^### Shot (\d+\.\d+)\s+·\s+([^\s(]+)\s+\((\d+)s\)$/,
      );
      if (shotHeaderMatch) {
        commitShot();
        currentShot = {
          id: shotHeaderMatch[1].trim(),
          chapterNumber: currentChapter.number,
          timecode: shotHeaderMatch[2].trim(),
          durationSeconds: Number.parseInt(shotHeaderMatch[3], 10),
          narration: '',
          visual: '',
          camera: '',
          transition: '',
          audio: '',
          truthCategory: 'established',
          pauses: [],
          wordCount: 0,
        };
        continue;
      }

      if (currentShot) {
        if (line.startsWith('**Narration (verbatim):**')) {
          currentShot.narration = line
            .replace('**Narration (verbatim):**', '')
            .trim();
        } else if (line.startsWith('**Visual:**')) {
          currentShot.visual = line.replace('**Visual:**', '').trim();
        } else if (line.startsWith('**Camera:**')) {
          currentShot.camera = line.replace('**Camera:**', '').trim();
        } else if (line.startsWith('**Transition:**')) {
          currentShot.transition = line.replace('**Transition:**', '').trim();
        } else if (line.startsWith('**Audio:**')) {
          currentShot.audio = line
            .replace('**Audio:**', '')
            .trim()
            .replace(/\.\.$/, '.');
        }
      }
    }
  }

  commitChapter();

  const totalShots = chapters.reduce((acc, ch) => acc + ch.shots.length, 0);
  const totalWords = chapters.reduce((acc, ch) => acc + ch.narrationWords, 0);

  return {
    id,
    format: 'storyboard' as StoryFormat,
    seriesTitle,
    subtitle,
    episodeTitle,
    source,
    targetEdit,
    narrationPolicy,
    timingNote,
    visualTruthPolicy,
    soundEditKey,
    chapters,
    checklist,
    totalShots,
    totalWords,
  };
}

interface ParsedWav {
  sampleRate: number;
  numChannels: number;
  bitsPerSample: number;
  pcmData: Buffer;
}

function extractWavPcm(wavBuffer: Buffer): ParsedWav {
  if (
    wavBuffer.length < 44 ||
    wavBuffer.toString('ascii', 0, 4) !== 'RIFF' ||
    wavBuffer.toString('ascii', 8, 12) !== 'WAVE'
  ) {
    return {
      sampleRate: 24000,
      numChannels: 1,
      bitsPerSample: 16,
      pcmData: wavBuffer,
    };
  }

  let sampleRate = 24000;
  let numChannels = 1;
  let bitsPerSample = 16;
  let dataOffset = 44;
  let dataSize = wavBuffer.length - 44;

  let offset = 12;
  while (offset + 8 <= wavBuffer.length) {
    const chunkId = wavBuffer.toString('ascii', offset, offset + 4);
    const chunkSize = wavBuffer.readUInt32LE(offset + 4);
    if (chunkId === 'fmt ' && offset + 24 <= wavBuffer.length) {
      numChannels = wavBuffer.readUInt16LE(offset + 10);
      sampleRate = wavBuffer.readUInt32LE(offset + 12);
      bitsPerSample = wavBuffer.readUInt16LE(offset + 22);
    } else if (chunkId === 'data') {
      dataOffset = offset + 8;
      dataSize = Math.min(chunkSize, wavBuffer.length - dataOffset);
      break;
    }
    offset += 8 + chunkSize + (chunkSize % 2);
  }

  return {
    sampleRate,
    numChannels,
    bitsPerSample,
    pcmData: wavBuffer.subarray(dataOffset, dataOffset + dataSize),
  };
}

function applyPcmEdgeFade(
  pcm: Buffer,
  sampleRate: number,
  bitsPerSample: number,
): Buffer {
  if (bitsPerSample !== 16 || pcm.length < 4) return pcm;
  const out = Buffer.from(pcm);
  const totalSamples = Math.floor(out.length / 2);
  const fadeSamples = Math.min(Math.floor(sampleRate * 0.01), Math.floor(totalSamples / 4));
  for (let i = 0; i < fadeSamples; i++) {
    const gain = 0.5 * (1 - Math.cos((Math.PI * i) / fadeSamples));
    const headVal = Math.round(out.readInt16LE(i * 2) * gain);
    out.writeInt16LE(headVal, i * 2);

    const tailIdx = totalSamples - 1 - i;
    const tailVal = Math.round(out.readInt16LE(tailIdx * 2) * gain);
    out.writeInt16LE(tailVal, tailIdx * 2);
  }
  return out;
}

function buildWavFromPcm(
  pcmChunks: Buffer[],
  sampleRate: number,
  numChannels: number,
  bitsPerSample: number,
): Buffer {
  const tapered = pcmChunks.map((chunk) =>
    applyPcmEdgeFade(chunk, sampleRate, bitsPerSample),
  );
  const pcmData = Buffer.concat(tapered);
  const bytesPerSample = bitsPerSample / 8;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + pcmData.length, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28);
  header.writeUInt16LE(numChannels * bytesPerSample, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(pcmData.length, 40);
  return Buffer.concat([header, pcmData]);
}

async function synthesizeSegmentWithRetry(
  ai: GoogleGenAI,
  text: string,
  voiceName: PrebuiltVoiceName,
  style: string,
  attempts = 3,
): Promise<Buffer> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const interaction = await ai.interactions.create({
        model: 'gemini-3.8-flash-tts',
        input: [
          {
            type: 'text',
            text,
            annotations: [
              {
                type: 'speech_metadata',
                style,
              },
            ],
          },
        ],
        response_format: { type: 'audio' },
        generation_config: {
          speech_config: [
            {
              language: 'en-US',
              voice: voiceName,
            },
          ],
        },
      });

      const base64Audio = interaction.output_audio?.data;
      if (!base64Audio) {
        throw new Error('TTS model returned an empty audio payload.');
      }
      return Buffer.from(base64Audio, 'base64');
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isRetryable =
        msg.includes('429') ||
        msg.includes('500') ||
        msg.includes('503') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('RESOURCE_EXHAUSTED');
      if (!isRetryable || attempt === attempts) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
    }
  }
  throw lastError;
}

type SpeechToken =
  | { type: 'text'; value: string }
  | { type: 'pause'; seconds: number };

function tokenizeSpeechWithPauses(
  input: string,
  preservePauses: boolean,
): SpeechToken[] {
  const pauseRegex = /\[PAUSE(?:\s*-\s*(\d+)\s*SECONDS?)?\]/gi;
  if (!preservePauses) {
    const cleaned = input.replace(pauseRegex, '').replace(/\s{2,}/g, ' ').trim();
    return cleaned ? [{ type: 'text', value: cleaned }] : [];
  }

  const tokens: SpeechToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pauseRegex.exec(input)) !== null) {
    const before = input.slice(lastIndex, match.index).trim();
    if (before) {
      tokens.push({ type: 'text', value: before });
    }
    const seconds = match[1] ? Number.parseInt(match[1], 10) : 1.5;
    tokens.push({
      type: 'pause',
      seconds: Number.isFinite(seconds) ? Math.min(Math.max(seconds, 0.5), 10) : 1.5,
    });
    lastIndex = match.index + match[0].length;
  }

  const tail = input.slice(lastIndex).trim();
  if (tail) {
    tokens.push({ type: 'text', value: tail });
  }

  return tokens;
}

function sanitizeStorySlug(input: string): string {
  const base = path
    .basename(input)
    .replace(/\.(md|markdown|txt)$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
  return base || `story-${Date.now()}`;
}

function resolveSafeStoryFile(id: string): string | null {
  if (!/^[a-z0-9][a-z0-9-_]{0,80}$/i.test(id)) {
    return null;
  }
  const candidate = path.resolve(STORIES_DIR, `${id}.md`);
  if (!candidate.startsWith(`${STORIES_DIR}${path.sep}`)) {
    return null;
  }
  return candidate;
}

function ensureStoriesSeeded() {
  if (!fs.existsSync(STORIES_DIR)) {
    fs.mkdirSync(STORIES_DIR, { recursive: true });
  }
  const builtInTarget = path.resolve(STORIES_DIR, `${BUILT_IN_STORY_ID}.md`);
  if (!fs.existsSync(builtInTarget)) {
    const seedPath = path.resolve(process.cwd(), SEED_STORYBOARD_RELATIVE_PATH);
    if (fs.existsSync(seedPath)) {
      fs.copyFileSync(seedPath, builtInTarget);
    }
  }
}

function listAllStories(): { summaries: StorySummary[]; byId: Map<string, StoryboardData> } {
  ensureStoriesSeeded();
  const files = fs
    .readdirSync(STORIES_DIR)
    .filter((f) => f.toLowerCase().endsWith('.md'));

  const summaries: StorySummary[] = [];
  const byId = new Map<string, StoryboardData>();

  for (const filename of files) {
    const id = filename.replace(/\.md$/i, '');
    const fullPath = path.resolve(STORIES_DIR, filename);
    const stat = fs.statSync(fullPath);
    const markdown = fs.readFileSync(fullPath, 'utf-8');
    const parsed = parseStoryMarkdown(markdown, id, id.replace(/-/g, ' '));
    byId.set(id, parsed);
    summaries.push({
      id,
      filename,
      seriesTitle: parsed.seriesTitle,
      episodeTitle: parsed.episodeTitle,
      subtitle: parsed.subtitle,
      targetEdit: parsed.targetEdit,
      chaptersCount: parsed.chapters.length,
      totalShots: parsed.totalShots,
      totalWords: parsed.totalWords,
      format: parsed.format,
      updatedAt: stat.mtime.toISOString(),
      isBuiltIn: id === BUILT_IN_STORY_ID,
    });
  }

  summaries.sort((a, b) => {
    if (a.isBuiltIn && !b.isBuiltIn) return -1;
    if (!a.isBuiltIn && b.isBuiltIn) return 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });

  return { summaries, byId };
}

async function startServer() {
  ensureStoriesSeeded();
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/stories', (_req, res) => {
    try {
      const { summaries } = listAllStories();
      res.json({ stories: summaries });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to list stories.';
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/stories/:id/raw', (req, res) => {
    try {
      const safePath = resolveSafeStoryFile(req.params.id);
      if (!safePath || !fs.existsSync(safePath)) {
        res.status(404).json({ error: 'Story Markdown file not found.' });
        return;
      }
      const content = fs.readFileSync(safePath, 'utf-8');
      res.json({
        id: req.params.id,
        filename: path.basename(safePath),
        content,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to read story source.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/stories', (req, res) => {
    try {
      const body = req.body as {
        filename?: unknown;
        title?: unknown;
        content?: unknown;
        overwrite?: unknown;
      };

      const content =
        typeof body.content === 'string' ? body.content.trim() : '';
      if (!content) {
        res.status(400).json({ error: 'Markdown content cannot be empty.' });
        return;
      }
      if (content.length > 1_500_000) {
        res
          .status(400)
          .json({ error: 'Markdown file exceeds 1.5 MB size limit.' });
        return;
      }

      const titleHint =
        typeof body.title === 'string' && body.title.trim()
          ? body.title.trim()
          : '';
      const filenameHint =
        typeof body.filename === 'string' && body.filename.trim()
          ? body.filename.trim()
          : titleHint || `story-${Date.now()}`;

      let slug = sanitizeStorySlug(filenameHint);
      const overwrite = body.overwrite === true;

      if (!overwrite) {
        let suffix = 2;
        const baseSlug = slug;
        while (fs.existsSync(path.resolve(STORIES_DIR, `${slug}.md`))) {
          slug = `${baseSlug}-${suffix}`;
          suffix += 1;
        }
      }

      const targetPath = resolveSafeStoryFile(slug);
      if (!targetPath) {
        res.status(400).json({ error: 'Invalid filename for story.' });
        return;
      }

      const parsed = parseStoryMarkdown(
        content,
        slug,
        titleHint || slug.replace(/-/g, ' '),
      );
      if (parsed.totalShots === 0) {
        res.status(400).json({
          error:
            'No readable story paragraphs or shots were found in this Markdown file.',
        });
        return;
      }

      fs.writeFileSync(targetPath, content, 'utf-8');
      const stat = fs.statSync(targetPath);

      const summary: StorySummary = {
        id: slug,
        filename: `${slug}.md`,
        seriesTitle: parsed.seriesTitle,
        episodeTitle: parsed.episodeTitle,
        subtitle: parsed.subtitle,
        targetEdit: parsed.targetEdit,
        chaptersCount: parsed.chapters.length,
        totalShots: parsed.totalShots,
        totalWords: parsed.totalWords,
        format: parsed.format,
        updatedAt: stat.mtime.toISOString(),
        isBuiltIn: slug === BUILT_IN_STORY_ID,
      };

      res.status(201).json({ story: summary, storyboard: parsed });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to save story Markdown.';
      res.status(500).json({ error: message });
    }
  });

  app.delete('/api/stories/:id', (req, res) => {
    try {
      const id = req.params.id;
      if (id === BUILT_IN_STORY_ID) {
        res.status(400).json({
          error: 'The built-in Flannan Isles episode cannot be deleted.',
        });
        return;
      }
      const safePath = resolveSafeStoryFile(id);
      if (!safePath || !fs.existsSync(safePath)) {
        res.status(404).json({ error: 'Story Markdown file not found.' });
        return;
      }
      fs.unlinkSync(safePath);
      res.json({ deletedId: id });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete story.';
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/tts/status', (_req, res) => {
    const key = process.env.GEMINI_API_KEY;
    const available = Boolean(key && key !== 'MY_GEMINI_API_KEY');
    res.json({ available });
  });

  app.get('/api/storyboard', (req, res) => {
    try {
      const { summaries, byId } = listAllStories();
      const requestedId =
        typeof req.query.id === 'string' && req.query.id.trim()
          ? req.query.id.trim()
          : BUILT_IN_STORY_ID;

      const selected =
        byId.get(requestedId) ??
        byId.get(BUILT_IN_STORY_ID) ??
        (summaries[0] ? byId.get(summaries[0].id) : undefined);

      if (!selected) {
        res.status(404).json({ error: 'No story Markdown files available.' });
        return;
      }
      res.json(selected);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load storyboard.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/tts', async (req, res) => {
    try {
      const body = req.body as {
        text?: unknown;
        voiceName?: unknown;
        style?: unknown;
        preservePauses?: unknown;
      };

      const rawText = typeof body.text === 'string' ? body.text.trim() : '';
      if (!rawText) {
        res.status(400).json({ error: 'Narration text is required.' });
        return;
      }
      if (rawText.length > 4500) {
        res.status(400).json({
          error: 'Narration excerpt exceeds 4,500 characters. Synthesize in shorter segments.',
        });
        return;
      }

      const requestedVoice =
        typeof body.voiceName === 'string' &&
        VALID_VOICES.has(body.voiceName as PrebuiltVoiceName)
          ? (body.voiceName as PrebuiltVoiceName)
          : 'Charon';

      const stylePrompt =
        typeof body.style === 'string' && body.style.trim().length > 0
          ? body.style.trim().slice(0, 300)
          : DEFAULT_STYLE;

      const preservePauses =
        typeof body.preservePauses === 'boolean' ? body.preservePauses : true;

      const tokens = tokenizeSpeechWithPauses(rawText, preservePauses);
      if (tokens.length === 0) {
        res.status(400).json({ error: 'No speakable text provided.' });
        return;
      }

      const ai = getAiClient();

      // Fast single-segment path
      if (tokens.length === 1 && tokens[0].type === 'text') {
        const wavBuffer = await synthesizeSegmentWithRetry(
          ai,
          tokens[0].value,
          requestedVoice,
          stylePrompt,
        );
        const parsed = extractWavPcm(wavBuffer);
        const bytesPerSec =
          parsed.sampleRate * parsed.numChannels * (parsed.bitsPerSample / 8);
        const durationSeconds =
          bytesPerSec > 0 ? parsed.pcmData.length / bytesPerSec : 0;

        res.json({
          audioBase64: wavBuffer.toString('base64'),
          mimeType: 'audio/wav',
          voiceName: requestedVoice,
          style: stylePrompt,
          durationSeconds,
          model: 'gemini-3.8-flash-tts',
        });
        return;
      }

      // Multi-segment path preserving exact scripted pause durations in 24kHz mono 16-bit PCM
      const pcmParts: Buffer[] = [];
      let sampleRate = 24000;
      let numChannels = 1;
      let bitsPerSample = 16;

      for (const token of tokens) {
        if (token.type === 'text') {
          const segWav = await synthesizeSegmentWithRetry(
            ai,
            token.value,
            requestedVoice,
            stylePrompt,
          );
          const parsed = extractWavPcm(segWav);
          sampleRate = parsed.sampleRate;
          numChannels = parsed.numChannels;
          bitsPerSample = parsed.bitsPerSample;
          pcmParts.push(parsed.pcmData);
        } else {
          const silenceByteCount =
            Math.round(token.seconds * sampleRate) *
            numChannels *
            (bitsPerSample / 8);
          pcmParts.push(Buffer.alloc(silenceByteCount));
        }
      }

      const stitchedWav = buildWavFromPcm(
        pcmParts,
        sampleRate,
        numChannels,
        bitsPerSample,
      );
      const totalPcmBytes = pcmParts.reduce((sum, buf) => sum + buf.length, 0);
      const bytesPerSec = sampleRate * numChannels * (bitsPerSample / 8);
      const durationSeconds = bytesPerSec > 0 ? totalPcmBytes / bytesPerSec : 0;

      res.json({
        audioBase64: stitchedWav.toString('base64'),
        mimeType: 'audio/wav',
        voiceName: requestedVoice,
        style: stylePrompt,
        durationSeconds,
        model: 'gemini-3.8-flash-tts',
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'TTS generation failed.';
      const status =
        message.includes('API_KEY_INVALID') ||
        message.includes('PERMISSION_DENIED') ||
        message.includes('GEMINI_API_KEY')
          ? 400
          : message.includes('RESOURCE_EXHAUSTED') || message.includes('429')
            ? 429
            : 500;
      res.status(status).json({ error: message });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Flannan Isles Studio listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
