import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { ChecklistView } from './components/ChecklistView';
import { DashboardView } from './components/DashboardView';
import { EvidenceMapView } from './components/EvidenceMapView';
import { StoryboardView } from './components/StoryboardView';
import { TopBar, type StudioView } from './components/TopBar';
import {
  VoiceControlBar,
  type SpeechEngineMode,
} from './components/VoiceControlBar';
import { VoiceLabView } from './components/VoiceLabView';
import { DEFAULT_VOICE_PRESET } from './data/voicePresets';
import type {
  Chapter,
  PrebuiltVoiceName,
  Shot,
  StoryboardData,
  StorySummary,
  SynthesizedTake,
} from './types/storyboard';
import {
  BrowserNarratorController,
  getAvailableBrowserVoices,
  pickDefaultDeepBrowserVoice,
} from './utils/browserNarrator';
import {
  base64ToWavBlob,
  concatenateWavBlobs,
  generateSrtCaptions,
  getWavDurationSeconds,
} from './utils/wavUtils';

interface CachedAudioAsset {
  url: string;
  blob: Blob;
  durationSeconds: number;
  label: string;
  filename: string;
}

export default function App() {
  const [stories, setStories] = useState<StorySummary[]>([]);
  const [activeStoryId, setActiveStoryId] = useState<string>(
    'flannan-isles-episode-01',
  );
  const [storyboard, setStoryboard] = useState<StoryboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUploadingStory, setIsUploadingStory] = useState(false);

  const [activeView, setActiveView] = useState<StudioView>('dashboard');
  const [activeChapterNumber, setActiveChapterNumber] = useState<number>(1);
  const [activeShotId, setActiveShotId] = useState<string>('01.01');

  // Speech engine defaults to Browser Voice (Offline · Zero AI)
  const [speechEngine, setSpeechEngine] = useState<SpeechEngineMode>('browser');
  const [studioTtsAvailable, setStudioTtsAvailable] = useState<boolean>(false);

  // Browser Voice state (Zero AI)
  const browserNarratorRef = useRef<BrowserNarratorController | null>(null);
  const chapterCancelRef = useRef<boolean>(false);
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>(
    [],
  );
  const [selectedBrowserVoiceURI, setSelectedBrowserVoiceURI] =
    useState<string>('');
  const [browserPitch, setBrowserPitch] = useState<number>(0.78);
  const [browserRate, setBrowserRate] = useState<number>(0.85);
  const [isBrowserSpeaking, setIsBrowserSpeaking] = useState<boolean>(false);

  // Optional Studio WAV voice settings
  const [voiceName, setVoiceName] = useState<PrebuiltVoiceName>(
    DEFAULT_VOICE_PRESET.voiceName,
  );
  const [stylePrompt, setStylePrompt] = useState<string>(
    DEFAULT_VOICE_PRESET.style,
  );

  const [cachedShots, setCachedShots] = useState<
    Record<string, CachedAudioAsset>
  >({});
  const [cachedChapters, setCachedChapters] = useState<
    Record<string, CachedAudioAsset>
  >({});

  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);
  const [activeAudioBlob, setActiveAudioBlob] = useState<Blob | null>(null);
  const [activeAudioLabel, setActiveAudioLabel] = useState<string>(
    'Select a story beat to read aloud',
  );
  const [activeDownloadFilename, setActiveDownloadFilename] = useState<string>(
    'ember-and-echo-narration.wav',
  );
  const [activeAudioShotId, setActiveAudioShotId] = useState<string | null>(
    null,
  );
  const [chapterGapSeconds, setChapterGapSeconds] = useState<number>(1.0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [autoPlayNonce, setAutoPlayNonce] = useState(0);
  const [togglePlayNonce, setTogglePlayNonce] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);

  const [generatingShotId, setGeneratingShotId] = useState<string | null>(null);
  const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);
  const [chapterSynthesisProgress, setChapterSynthesisProgress] = useState<{
    chapterNumber: number;
    completed: number;
    total: number;
  } | null>(null);

  const [takes, setTakes] = useState<SynthesizedTake[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [labInitialText, setLabInitialText] = useState<string>('');
  const [labInitialLabel, setLabInitialLabel] = useState<string>('');

  // Initialize Browser Narrator & System Voices
  useEffect(() => {
    browserNarratorRef.current = new BrowserNarratorController();
    const syncVoices = () => {
      const voices = getAvailableBrowserVoices();
      setBrowserVoices(voices);
      setSelectedBrowserVoiceURI((prev) => {
        if (prev && voices.some((v) => v.voiceURI === prev)) return prev;
        return pickDefaultDeepBrowserVoice(voices)?.voiceURI ?? '';
      });
    };
    syncVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = syncVoices;
    }
    return () => {
      chapterCancelRef.current = true;
      browserNarratorRef.current?.stop();
    };
  }, []);

  const stopBrowserReading = useCallback(() => {
    chapterCancelRef.current = true;
    browserNarratorRef.current?.stop();
    setIsBrowserSpeaking(false);
  }, []);

  const fetchStoriesAndStoryboard = useCallback(
    async (storyIdToLoad?: string) => {
      setLoading(true);
      setLoadError(null);
      try {
        const [storiesRes, ttsStatusRes] = await Promise.all([
          fetch('/api/stories'),
          fetch('/api/tts/status').catch(() => null),
        ]);

        if (!storiesRes.ok) {
          throw new Error(`Failed to load story library (${storiesRes.status})`);
        }
        const storiesJson = (await storiesRes.json()) as {
          stories: StorySummary[];
        };
        setStories(storiesJson.stories);

        if (ttsStatusRes?.ok) {
          const statusData = (await ttsStatusRes.json()) as {
            available?: boolean;
          };
          setStudioTtsAvailable(Boolean(statusData.available));
        }

        const targetId =
          storyIdToLoad ||
          storiesJson.stories[0]?.id ||
          'flannan-isles-episode-01';
        const sbRes = await fetch(
          `/api/storyboard?id=${encodeURIComponent(targetId)}`,
        );
        if (!sbRes.ok) {
          const errBody = (await sbRes.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(
            errBody.error || `Failed to load story (${sbRes.status})`,
          );
        }
        const sbData = (await sbRes.json()) as StoryboardData;
        setStoryboard(sbData);
        setActiveStoryId(sbData.id);
        const firstChapter = sbData.chapters[0];
        const firstShot = firstChapter?.shots[0];
        if (firstChapter && firstShot) {
          setActiveChapterNumber(firstChapter.number);
          setActiveShotId(firstShot.id);
          setActiveAudioLabel(
            `${sbData.episodeTitle} · Beat ${firstShot.id}`,
          );
        }
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : 'Unable to load stories.',
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void fetchStoriesAndStoryboard();
  }, [fetchStoriesAndStoryboard]);

  const handleSelectStory = useCallback(
    async (storyId: string) => {
      stopBrowserReading();
      setErrorMessage(null);
      setLoading(true);
      try {
        const res = await fetch(
          `/api/storyboard?id=${encodeURIComponent(storyId)}`,
        );
        if (!res.ok) {
          const errBody = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(errBody.error || 'Failed to open story.');
        }
        const data = (await res.json()) as StoryboardData;
        setStoryboard(data);
        setActiveStoryId(data.id);
        const firstChapter = data.chapters[0];
        const firstShot = firstChapter?.shots[0];
        if (firstChapter && firstShot) {
          setActiveChapterNumber(firstChapter.number);
          setActiveShotId(firstShot.id);
          setActiveAudioLabel(`${data.episodeTitle} · Beat ${firstShot.id}`);
        }
        setActiveView('storyboard');
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Failed to switch story.',
        );
      } finally {
        setLoading(false);
      }
    },
    [stopBrowserReading],
  );

  const handleUploadStory = useCallback(
    async (payload: { filename: string; content: string }) => {
      setIsUploadingStory(true);
      try {
        const res = await fetch('/api/stories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = (await res.json().catch(() => ({}))) as {
          story?: StorySummary;
          storyboard?: StoryboardData;
          error?: string;
        };
        if (!res.ok || !data.story || !data.storyboard) {
          throw new Error(
            data.error || `Failed to save Markdown file (${res.status})`,
          );
        }
        const storiesRes = await fetch('/api/stories');
        if (storiesRes.ok) {
          const listJson = (await storiesRes.json()) as {
            stories: StorySummary[];
          };
          setStories(listJson.stories);
        }
      } finally {
        setIsUploadingStory(false);
      }
    },
    [],
  );

  const handleDeleteStory = useCallback(
    async (storyId: string) => {
      const res = await fetch(`/api/stories/${encodeURIComponent(storyId)}`, {
        method: 'DELETE',
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(body.error || 'Failed to delete story.');
      }
      const nextFallback =
        activeStoryId === storyId ? 'flannan-isles-episode-01' : activeStoryId;
      await fetchStoriesAndStoryboard(nextFallback);
    },
    [activeStoryId, fetchStoriesAndStoryboard],
  );

  const allShots = useMemo(
    () => storyboard?.chapters.flatMap((c) => c.shots) ?? [],
    [storyboard],
  );

  const activeShot = useMemo(
    () => allShots.find((s) => s.id === activeShotId) ?? allShots[0] ?? null,
    [allShots, activeShotId],
  );

  const shotCacheKey = (shotId: string) => `${activeStoryId}:${shotId}`;
  const chapterCacheKey = (chNum: number) =>
    `${activeStoryId}:ch-${chNum}:${chapterGapSeconds}`;

  // Browser Voice reading handlers (100% Zero AI)
  const handleReadShotBrowser = useCallback(
    async (shot: Shot) => {
      if (!browserNarratorRef.current) return;
      setErrorMessage(null);
      chapterCancelRef.current = false;
      setActiveAudioLabel(
        `${storyboard?.episodeTitle ?? 'Story'} · Beat ${shot.id}`,
      );

      await browserNarratorRef.current.speak({
        text: shot.narration,
        voiceURI: selectedBrowserVoiceURI || undefined,
        pitch: browserPitch,
        rate: browserRate,
        onStart: () => setIsBrowserSpeaking(true),
        onEnd: () => {
          setIsBrowserSpeaking(false);
          if (autoAdvance && !chapterCancelRef.current) {
            const idx = allShots.findIndex((s) => s.id === shot.id);
            if (idx >= 0 && idx < allShots.length - 1) {
              const nextShot = allShots[idx + 1];
              setActiveChapterNumber(nextShot.chapterNumber);
              setActiveShotId(nextShot.id);
              void handleReadShotBrowser(nextShot);
            }
          }
        },
        onError: (msg) => {
          setIsBrowserSpeaking(false);
          setErrorMessage(msg);
        },
      });
    },
    [
      storyboard?.episodeTitle,
      selectedBrowserVoiceURI,
      browserPitch,
      browserRate,
      autoAdvance,
      allShots,
    ],
  );

  const handleReadChapterBrowser = useCallback(
    async (chapter: Chapter) => {
      if (!browserNarratorRef.current) return;
      stopBrowserReading();
      chapterCancelRef.current = false;
      setErrorMessage(null);
      setIsBrowserSpeaking(true);

      for (let i = 0; i < chapter.shots.length; i++) {
        if (chapterCancelRef.current) break;
        const shot = chapter.shots[i];
        setActiveChapterNumber(shot.chapterNumber);
        setActiveShotId(shot.id);
        setActiveAudioLabel(
          `Ch. ${String(chapter.number).padStart(2, '0')} · Beat ${shot.id}`,
        );

        await new Promise<void>((resolve) => {
          void browserNarratorRef.current?.speak({
            text: shot.narration,
            voiceURI: selectedBrowserVoiceURI || undefined,
            pitch: browserPitch,
            rate: browserRate,
            onEnd: () => resolve(),
            onError: (msg) => {
              setErrorMessage(msg);
              chapterCancelRef.current = true;
              resolve();
            },
          });
        });

        if (!chapterCancelRef.current && i < chapter.shots.length - 1) {
          await new Promise<void>((resolve) =>
            window.setTimeout(resolve, chapterGapSeconds * 1000),
          );
        }
      }
      setIsBrowserSpeaking(false);
    },
    [
      stopBrowserReading,
      selectedBrowserVoiceURI,
      browserPitch,
      browserRate,
      chapterGapSeconds,
    ],
  );

  // Optional Studio WAV synthesis via /api/tts
  const requestTtsAudio = useCallback(
    async (
      text: string,
      chosenVoice: PrebuiltVoiceName,
      chosenStyle: string,
      preservePauses = true,
    ): Promise<{ blob: Blob; url: string; durationSeconds: number }> => {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceName: chosenVoice,
          style: chosenStyle,
          preservePauses,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        audioBase64?: string;
        mimeType?: string;
        durationSeconds?: number;
        error?: string;
      };
      if (!res.ok || !payload.audioBase64) {
        throw new Error(
          payload.error || `Narration synthesis failed (${res.status})`,
        );
      }
      const blob = base64ToWavBlob(
        payload.audioBase64,
        payload.mimeType || 'audio/wav',
      );
      const url = URL.createObjectURL(blob);
      const durationSeconds =
        typeof payload.durationSeconds === 'number' &&
        payload.durationSeconds > 0
          ? payload.durationSeconds
          : await getWavDurationSeconds(blob);
      return { blob, url, durationSeconds };
    },
    [],
  );

  const loadAssetAndPlay = useCallback(
    (asset: CachedAudioAsset, shotId: string | null) => {
      stopBrowserReading();
      setActiveAudioUrl(asset.url);
      setActiveAudioBlob(asset.blob);
      setActiveAudioLabel(asset.label);
      setActiveDownloadFilename(asset.filename);
      setActiveAudioShotId(shotId);
      setAutoPlayNonce((n) => n + 1);
    },
    [stopBrowserReading],
  );

  const handleGenerateShot = useCallback(
    async (shot: Shot) => {
      setErrorMessage(null);
      setGeneratingShotId(shot.id);
      try {
        const { blob, url, durationSeconds } = await requestTtsAudio(
          shot.narration,
          voiceName,
          stylePrompt,
          true,
        );
        const label = `Beat ${shot.id} · ${shot.timecode}`;
        const filename = `${activeStoryId}-shot-${shot.id.replace('.', '-')}.wav`;
        const asset: CachedAudioAsset = {
          url,
          blob,
          durationSeconds,
          label,
          filename,
        };
        setCachedShots((prev) => ({
          ...prev,
          [`${activeStoryId}:${shot.id}`]: asset,
        }));
        setTakes((prev) => [
          {
            id: `${activeStoryId}-${shot.id}-${Date.now()}`,
            label: `${storyboard?.episodeTitle ?? activeStoryId} · ${label}`,
            text: shot.narration,
            voiceName,
            style: stylePrompt,
            audioUrl: url,
            blob,
            durationSeconds,
            createdAt: Date.now(),
          },
          ...prev,
        ]);
        loadAssetAndPlay(asset, shot.id);
      } catch (err) {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Unable to synthesize Studio WAV for this beat.',
        );
      } finally {
        setGeneratingShotId(null);
      }
    },
    [
      requestTtsAudio,
      voiceName,
      stylePrompt,
      activeStoryId,
      storyboard?.episodeTitle,
      loadAssetAndPlay,
    ],
  );

  const handleGenerateChapter = useCallback(
    async (chapter: Chapter) => {
      setErrorMessage(null);
      const total = chapter.shots.length;
      if (total === 0) return;

      setChapterSynthesisProgress({
        chapterNumber: chapter.number,
        completed: 0,
        total,
      });

      try {
        const blobs: Blob[] = [];
        const newCacheEntries: Record<string, CachedAudioAsset> = {};

        for (let i = 0; i < chapter.shots.length; i++) {
          const shot = chapter.shots[i];
          const key = `${activeStoryId}:${shot.id}`;
          const existing = cachedShots[key];
          if (existing) {
            blobs.push(existing.blob);
          } else {
            const { blob, url, durationSeconds } = await requestTtsAudio(
              shot.narration,
              voiceName,
              stylePrompt,
              true,
            );
            const shotLabel = `Beat ${shot.id} · ${shot.timecode}`;
            const shotFilename = `${activeStoryId}-shot-${shot.id.replace('.', '-')}.wav`;
            newCacheEntries[key] = {
              url,
              blob,
              durationSeconds,
              label: shotLabel,
              filename: shotFilename,
            };
            blobs.push(blob);
          }
          setChapterSynthesisProgress({
            chapterNumber: chapter.number,
            completed: i + 1,
            total,
          });
        }

        if (Object.keys(newCacheEntries).length > 0) {
          setCachedShots((prev) => ({ ...prev, ...newCacheEntries }));
        }

        const masterBlob = await concatenateWavBlobs(blobs, chapterGapSeconds);
        const masterUrl = URL.createObjectURL(masterBlob);
        const masterDuration = await getWavDurationSeconds(masterBlob);
        const masterLabel = `Chapter ${String(chapter.number).padStart(2, '0')} — ${chapter.title}`;
        const masterFilename = `${activeStoryId}-chapter-${String(chapter.number).padStart(2, '0')}.wav`;

        const chapterAsset: CachedAudioAsset = {
          url: masterUrl,
          blob: masterBlob,
          durationSeconds: masterDuration,
          label: masterLabel,
          filename: masterFilename,
        };

        setCachedChapters((prev) => ({
          ...prev,
          [`${activeStoryId}:ch-${chapter.number}:${chapterGapSeconds}`]:
            chapterAsset,
        }));
        setTakes((prev) => [
          {
            id: `${activeStoryId}-ch-${chapter.number}-${Date.now()}`,
            label: `${storyboard?.episodeTitle ?? activeStoryId} · ${masterLabel}`,
            text: `Complete ${chapter.shots.length}-beat narration master (${chapter.editorialWindow}).`,
            voiceName,
            style: stylePrompt,
            audioUrl: masterUrl,
            blob: masterBlob,
            durationSeconds: masterDuration,
            createdAt: Date.now(),
          },
          ...prev,
        ]);

        loadAssetAndPlay(chapterAsset, null);
      } catch (err) {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Chapter synthesis interrupted. Partial takes were preserved.',
        );
      } finally {
        setChapterSynthesisProgress(null);
      }
    },
    [
      activeStoryId,
      cachedShots,
      requestTtsAudio,
      voiceName,
      stylePrompt,
      chapterGapSeconds,
      storyboard?.episodeTitle,
      loadAssetAndPlay,
    ],
  );

  const handleSynthesizeCustom = useCallback(
    async (opts: {
      text: string;
      label: string;
      voiceName: PrebuiltVoiceName;
      style: string;
      preservePauses: boolean;
    }) => {
      setErrorMessage(null);
      setIsGeneratingCustom(true);
      try {
        const { blob, url, durationSeconds } = await requestTtsAudio(
          opts.text,
          opts.voiceName,
          opts.style,
          opts.preservePauses,
        );
        const takeLabel = opts.label.trim() || 'Custom Narration Take';
        const take: SynthesizedTake = {
          id: `custom-${Date.now()}`,
          label: takeLabel,
          text: opts.text,
          voiceName: opts.voiceName,
          style: opts.style,
          audioUrl: url,
          blob,
          durationSeconds,
          createdAt: Date.now(),
        };
        setTakes((prev) => [take, ...prev]);
        setSpeechEngine('studio');
        loadAssetAndPlay(
          {
            url,
            blob,
            durationSeconds,
            label: takeLabel,
            filename: `${takeLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.wav`,
          },
          null,
        );
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Unable to synthesize take.',
        );
      } finally {
        setIsGeneratingCustom(false);
      }
    },
    [requestTtsAudio, loadAssetAndPlay],
  );

  const handleAudioEnded = useCallback(() => {
    if (!autoAdvance || !activeAudioShotId) return;
    const idx = allShots.findIndex((s) => s.id === activeAudioShotId);
    if (idx < 0 || idx >= allShots.length - 1) return;

    const nextShot = allShots[idx + 1];
    setActiveChapterNumber(nextShot.chapterNumber);
    setActiveShotId(nextShot.id);

    const cached = cachedShots[`${activeStoryId}:${nextShot.id}`];
    if (cached) {
      loadAssetAndPlay(cached, nextShot.id);
    } else {
      void handleGenerateShot(nextShot);
    }
  }, [
    autoAdvance,
    activeAudioShotId,
    allShots,
    cachedShots,
    activeStoryId,
    loadAssetAndPlay,
    handleGenerateShot,
  ]);

  const handleTopBarPrimaryAction = () => {
    if (!activeShot) return;
    if (speechEngine === 'browser') {
      if (isBrowserSpeaking) {
        stopBrowserReading();
      } else {
        void handleReadShotBrowser(activeShot);
      }
      return;
    }

    const cached = cachedShots[shotCacheKey(activeShot.id)];
    if (activeAudioUrl && activeAudioShotId === activeShot.id) {
      setTogglePlayNonce((n) => n + 1);
      return;
    }
    if (cached) {
      loadAssetAndPlay(cached, activeShot.id);
      return;
    }
    void handleGenerateShot(activeShot);
  };

  const storyScopedShotUrls = useMemo(() => {
    const map: Record<string, string> = {};
    const prefix = `${activeStoryId}:`;
    for (const [k, asset] of Object.entries(cachedShots)) {
      if (k.startsWith(prefix)) {
        map[k.slice(prefix.length)] = asset.url;
      }
    }
    return map;
  }, [cachedShots, activeStoryId]);

  const storyScopedChapterUrls = useMemo(() => {
    const map: Record<number, string> = {};
    const prefix = `${activeStoryId}:ch-`;
    const suffix = `:${chapterGapSeconds}`;
    for (const [k, asset] of Object.entries(cachedChapters)) {
      if (k.startsWith(prefix) && k.endsWith(suffix)) {
        const chNum = Number.parseInt(
          k.slice(prefix.length, k.length - suffix.length),
          10,
        );
        if (Number.isFinite(chNum)) {
          map[chNum] = asset.url;
        }
      }
    }
    return map;
  }, [cachedChapters, activeStoryId, chapterGapSeconds]);

  const isAnyGenerating =
    Boolean(generatingShotId) ||
    isGeneratingCustom ||
    Boolean(chapterSynthesisProgress);

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#F7F4EE] text-[#1C1917]">
      <TopBar
        activeView={activeView}
        onSelectView={setActiveView}
        onPrimaryAction={handleTopBarPrimaryAction}
        isGenerating={isAnyGenerating}
        hasActiveAudio={
          speechEngine === 'browser'
            ? Boolean(activeShot)
            : Boolean(
                activeShot &&
                  (cachedShots[shotCacheKey(activeShot.id)] ||
                    (activeAudioUrl && activeAudioShotId === activeShot.id)),
              )
        }
        isPlaying={
          speechEngine === 'browser'
            ? isBrowserSpeaking
            : isPlaying &&
              Boolean(activeShot && activeAudioShotId === activeShot.id)
        }
      />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 lg:px-10 py-8 space-y-8">
        {loading && (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-[#57534E]">
            <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" />
            <p className="text-sm">Loading Ember &amp; Echo story library...</p>
          </div>
        )}

        {!loading && loadError && (
          <div className="p-6 bg-white border border-[#9A3412]/40 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle
                className="w-5 h-5 text-[#9A3412] shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div>
                <h2 className="font-semibold text-sm text-[#1C1917]">
                  Unable to load stories
                </h2>
                <p className="text-xs text-[#57534E] mt-1">{loadError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void fetchStoriesAndStoryboard()}
              className="px-4 py-2 text-xs font-semibold text-[#F7F4EE] bg-[#1C1917] rounded-md self-start sm:self-center"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && storyboard && (
          <>
            {/* Editorial Masthead */}
            <section className="pb-6 border-b border-[#DDD6C8] flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="space-y-2 max-w-3xl">
                <div className="text-xs font-mono uppercase tracking-wider text-[#57534E] tabular-nums">
                  {storyboard.seriesTitle}
                  {storyboard.targetEdit ? ` · ${storyboard.targetEdit}` : ''}
                </div>
                <h1
                  className="font-serif text-3xl sm:text-5xl font-semibold text-[#1C1917] tracking-tight leading-[1.1]"
                  style={{ textWrap: 'balance' }}
                >
                  {storyboard.episodeTitle}
                </h1>
                <p className="text-sm text-[#57534E] leading-relaxed">
                  {storyboard.subtitle} · {storyboard.chapters.length} chapters ·{' '}
                  {storyboard.totalShots}{' '}
                  {storyboard.format === 'storyboard' ? 'shots' : 'beats'} ·{' '}
                  {storyboard.totalWords.toLocaleString()} words
                </p>
              </div>

              <div className="text-xs text-[#57534E] lg:text-right space-y-1 shrink-0">
                <div className="font-medium text-[#1C1917]">
                  Narration Mode
                </div>
                <div>
                  {speechEngine === 'browser'
                    ? 'Offline Browser Voice (Zero AI) · Deep pitch · Slow pacing'
                    : 'Studio WAV Export · Mysterious, serious, atmospheric'}
                </div>
              </div>
            </section>

            {/* Error Alert Banner */}
            {errorMessage && (
              <div
                role="alert"
                className="p-4 bg-white border border-[#9A3412]/40 rounded-md flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-2.5 text-sm text-[#1C1917]">
                  <AlertCircle
                    className="w-4 h-4 text-[#9A3412] shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span>{errorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  aria-label="Dismiss error"
                  className="text-[#57534E] hover:text-[#1C1917]"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            )}

            {/* Studio Audio & Voice Direction Deck */}
            <VoiceControlBar
              speechEngine={speechEngine}
              onChangeSpeechEngine={(mode) => {
                stopBrowserReading();
                setSpeechEngine(mode);
              }}
              studioTtsAvailable={studioTtsAvailable}
              browserVoices={browserVoices}
              selectedBrowserVoiceURI={selectedBrowserVoiceURI}
              onChangeBrowserVoiceURI={setSelectedBrowserVoiceURI}
              browserPitch={browserPitch}
              onChangeBrowserPitch={setBrowserPitch}
              browserRate={browserRate}
              onChangeBrowserRate={setBrowserRate}
              isBrowserSpeaking={isBrowserSpeaking}
              onPlayBrowserActive={() => {
                if (activeShot) void handleReadShotBrowser(activeShot);
              }}
              onStopBrowser={stopBrowserReading}
              audioUrl={activeAudioUrl}
              audioBlob={activeAudioBlob}
              audioLabel={activeAudioLabel}
              voiceName={voiceName}
              stylePrompt={stylePrompt}
              onChangeVoice={(nextVoice, nextStyle) => {
                setVoiceName(nextVoice);
                if (nextStyle) setStylePrompt(nextStyle);
              }}
              onChangeStyle={setStylePrompt}
              isPlaying={isPlaying}
              onPlayingChange={setIsPlaying}
              onEnded={handleAudioEnded}
              downloadFilename={activeDownloadFilename}
              autoPlayNonce={autoPlayNonce}
              togglePlayNonce={togglePlayNonce}
            />

            {/* Primary View Switcher */}
            {activeView === 'dashboard' && (
              <DashboardView
                stories={stories}
                activeStoryId={activeStoryId}
                onSelectStory={(id) => void handleSelectStory(id)}
                onUploadStory={handleUploadStory}
                onDeleteStory={handleDeleteStory}
                isUploading={isUploadingStory}
              />
            )}

            {activeView === 'storyboard' && activeShot && (
              <StoryboardView
                storyboard={storyboard}
                activeChapterNumber={activeChapterNumber}
                activeShotId={activeShot.id}
                onSelectShot={(chNum, shotId) => {
                  setActiveChapterNumber(chNum);
                  setActiveShotId(shotId);
                }}
                onGenerateShot={(shot) => void handleGenerateShot(shot)}
                onGenerateChapter={(ch) => void handleGenerateChapter(ch)}
                generatingShotId={generatingShotId}
                chapterSynthesisProgress={chapterSynthesisProgress}
                cachedShotUrls={storyScopedShotUrls}
                cachedChapterUrls={storyScopedChapterUrls}
                onPlayCachedShot={(shot) => {
                  const cached = cachedShots[shotCacheKey(shot.id)];
                  if (cached) loadAssetAndPlay(cached, shot.id);
                }}
                onPlayCachedChapter={(ch) => {
                  const cached = cachedChapters[chapterCacheKey(ch.number)];
                  if (cached) loadAssetAndPlay(cached, null);
                }}
                autoAdvance={autoAdvance}
                onToggleAutoAdvance={setAutoAdvance}
                onSendToVoiceLab={(txt, lbl) => {
                  setLabInitialText(txt);
                  setLabInitialLabel(lbl);
                  setActiveView('voice-lab');
                }}
                chapterGapSeconds={chapterGapSeconds}
                onChangeChapterGap={setChapterGapSeconds}
                onExportChapterSrt={(chapter) => {
                  const durations: Record<string, number> = {};
                  for (const s of chapter.shots) {
                    const cached = cachedShots[shotCacheKey(s.id)];
                    if (cached) {
                      durations[s.id] = cached.durationSeconds;
                    }
                  }
                  const hasAll = chapter.shots.every(
                    (s) => durations[s.id] !== undefined,
                  );
                  const srt = generateSrtCaptions(
                    chapter.shots,
                    hasAll ? durations : undefined,
                    chapterGapSeconds,
                  );
                  const srtBlob = new Blob([srt], {
                    type: 'text/plain;charset=utf-8',
                  });
                  const url = URL.createObjectURL(srtBlob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${activeStoryId}-chapter-${String(chapter.number).padStart(2, '0')}.srt`;
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 2000);
                }}
                speechEngine={speechEngine}
                isBrowserSpeaking={isBrowserSpeaking}
                onReadShotBrowser={(shot) => void handleReadShotBrowser(shot)}
                onReadChapterBrowser={(ch) => void handleReadChapterBrowser(ch)}
                onStopBrowser={stopBrowserReading}
              />
            )}

            {activeView === 'voice-lab' && (
              <VoiceLabView
                key={`${labInitialLabel}-${labInitialText.slice(0, 24)}`}
                initialText={labInitialText}
                initialLabel={labInitialLabel}
                voiceName={voiceName}
                stylePrompt={stylePrompt}
                onChangeVoice={(nextVoice, nextStyle) => {
                  setVoiceName(nextVoice);
                  if (nextStyle) setStylePrompt(nextStyle);
                }}
                onChangeStyle={setStylePrompt}
                onSynthesizeCustom={handleSynthesizeCustom}
                isGenerating={isGeneratingCustom}
                takes={takes}
                onPlayTake={(take) => {
                  setSpeechEngine('studio');
                  loadAssetAndPlay(
                    {
                      url: take.audioUrl,
                      blob: take.blob,
                      durationSeconds: take.durationSeconds,
                      label: take.label,
                      filename: `${take.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.wav`,
                    },
                    null,
                  );
                }}
                studioTtsAvailable={studioTtsAvailable}
                isBrowserSpeaking={isBrowserSpeaking}
                onReadBrowserText={(txt, lbl) => {
                  if (!browserNarratorRef.current) return;
                  stopBrowserReading();
                  setErrorMessage(null);
                  chapterCancelRef.current = false;
                  setSpeechEngine('browser');
                  setActiveAudioLabel(lbl || 'Voice Lab Script');
                  void browserNarratorRef.current.speak({
                    text: txt,
                    voiceURI: selectedBrowserVoiceURI || undefined,
                    pitch: browserPitch,
                    rate: browserRate,
                    onStart: () => setIsBrowserSpeaking(true),
                    onEnd: () => setIsBrowserSpeaking(false),
                    onError: (msg) => {
                      setIsBrowserSpeaking(false);
                      setErrorMessage(msg);
                    },
                  });
                }}
                onStopBrowser={stopBrowserReading}
              />
            )}

            {activeView === 'evidence' && (
              <EvidenceMapView
                storyboard={storyboard}
                onJumpToShot={(chNum, shotId) => {
                  setActiveChapterNumber(chNum);
                  setActiveShotId(shotId);
                  setActiveView('storyboard');
                }}
              />
            )}

            {activeView === 'checklist' && (
              <ChecklistView storyboard={storyboard} />
            )}
          </>
        )}
      </main>

      <footer className="mt-12 border-t border-[#DDD6C8] bg-[#EFEBE3]/50">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#57534E]">
          <span>
            Ember &amp; Echo · Markdown Story Library &amp; Atmospheric Narration Studio
          </span>
          <span>
            Offline browser speech &amp; local Markdown reader · Optional 24kHz &amp; 48kHz WAV export
          </span>
        </div>
      </footer>
    </div>
  );
}
