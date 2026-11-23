import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Layers,
  Loader2,
  Play,
  Search,
  Volume2,
} from 'lucide-react';
import type {
  Chapter,
  Shot,
  StoryboardData,
  TruthCategory,
} from '../types/storyboard';
import { EditorialCanvas } from './EditorialCanvas';

type ShotFilter = 'all' | 'reconstruction' | 'legend' | 'pauses';

interface StoryboardViewProps {
  storyboard: StoryboardData;
  activeChapterNumber: number;
  activeShotId: string;
  onSelectShot: (chapterNumber: number, shotId: string) => void;
  onGenerateShot: (shot: Shot) => void;
  onGenerateChapter: (chapter: Chapter) => void;
  generatingShotId: string | null;
  chapterSynthesisProgress: {
    chapterNumber: number;
    completed: number;
    total: number;
  } | null;
  cachedShotUrls: Record<string, string>;
  cachedChapterUrls: Record<number, string>;
  onPlayCachedShot: (shot: Shot) => void;
  onPlayCachedChapter: (chapter: Chapter) => void;
  autoAdvance: boolean;
  onToggleAutoAdvance: (next: boolean) => void;
  onSendToVoiceLab: (text: string, label: string) => void;
  chapterGapSeconds: number;
  onChangeChapterGap: (seconds: number) => void;
  onExportChapterSrt: (chapter: Chapter) => void;
  speechEngine: 'browser' | 'studio';
  isBrowserSpeaking: boolean;
  onReadShotBrowser: (shot: Shot) => void;
  onReadChapterBrowser: (chapter: Chapter) => void;
  onStopBrowser: () => void;
}

const TRUTH_LABELS: Record<TruthCategory, string> = {
  established: 'Established Record',
  reconstruction: 'Dramatic Reconstruction',
  legend: 'Legend / Unverified',
};

function renderNarrationWithPauses(narration: string) {
  const regex = /(\[PAUSE(?:\s*-\s*\d+\s*SECONDS?)?\])/gi;
  const parts = narration.split(regex);
  return parts.map((part, idx) => {
    if (regex.test(part)) {
      return (
        <span
          key={idx}
          className="inline-block mx-1.5 px-2 py-0.5 text-[11px] font-mono tracking-wide text-[#9A3412] bg-[#9A3412]/8 border border-[#9A3412]/25 rounded align-middle"
        >
          {part.replace(/^\[|\]$/g, '')}
        </span>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

export function StoryboardView({
  storyboard,
  activeChapterNumber,
  activeShotId,
  onSelectShot,
  onGenerateShot,
  onGenerateChapter,
  generatingShotId,
  chapterSynthesisProgress,
  cachedShotUrls,
  cachedChapterUrls,
  onPlayCachedShot,
  onPlayCachedChapter,
  autoAdvance,
  onToggleAutoAdvance,
  onSendToVoiceLab,
  chapterGapSeconds,
  onChangeChapterGap,
  onExportChapterSrt,
  speechEngine,
  isBrowserSpeaking,
  onReadShotBrowser,
  onReadChapterBrowser,
  onStopBrowser,
}: StoryboardViewProps) {
  const [filter, setFilter] = useState<ShotFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const activeChapter =
    storyboard.chapters.find((c) => c.number === activeChapterNumber) ??
    storyboard.chapters[0];

  const allShots = useMemo(
    () => storyboard.chapters.flatMap((c) => c.shots),
    [storyboard.chapters],
  );

  const activeShot =
    allShots.find((s) => s.id === activeShotId) ?? activeChapter.shots[0];

  const activeShotIndex = allShots.findIndex((s) => s.id === activeShot.id);
  const prevShot = activeShotIndex > 0 ? allShots[activeShotIndex - 1] : null;
  const nextShot =
    activeShotIndex >= 0 && activeShotIndex < allShots.length - 1
      ? allShots[activeShotIndex + 1]
      : null;

  const filteredShots = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const baseShots =
      filter === 'all' && !q ? activeChapter.shots : allShots;

    return baseShots.filter((shot) => {
      if (filter === 'reconstruction' && shot.truthCategory !== 'reconstruction') {
        return false;
      }
      if (filter === 'legend' && shot.truthCategory !== 'legend') {
        return false;
      }
      if (filter === 'pauses' && shot.pauses.length === 0) {
        return false;
      }
      if (q) {
        const hay = `${shot.id} ${shot.narration} ${shot.visual}`.toLowerCase();
        return hay.includes(q);
      }
      return true;
    });
  }, [activeChapter.shots, allShots, filter, searchQuery]);

  const isSynthesizingActiveShot = generatingShotId === activeShot.id;
  const isSynthesizingThisChapter =
    chapterSynthesisProgress?.chapterNumber === activeChapter.number;
  const hasCachedShot = Boolean(cachedShotUrls[activeShot.id]);
  const hasCachedChapter = Boolean(cachedChapterUrls[activeChapter.number]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Rail: Chapter Index & Shot List */}
      <aside className="lg:col-span-4 border border-[#DDD6C8] bg-[#EFEBE3]/60 rounded-md overflow-hidden">
        <div className="p-4 border-b border-[#DDD6C8] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-serif text-lg font-semibold text-[#1C1917]">
              Chapters & Shots
            </h2>
            <span className="font-mono text-xs tabular-nums text-[#57534E]">
              {storyboard.chapters.length} chapters · {storyboard.totalShots} shots
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5" role="tablist" aria-label="Chapter selector">
            {storyboard.chapters.map((ch) => {
              const isSelected = ch.number === activeChapter.number;
              const isReady = Boolean(cachedChapterUrls[ch.number]);
              return (
                <button
                  key={ch.number}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => {
                    setFilter('all');
                    setSearchQuery('');
                    const firstShot = ch.shots[0];
                    if (firstShot) {
                      onSelectShot(ch.number, firstShot.id);
                    }
                  }}
                  className={`px-2.5 py-2 text-left rounded border transition-colors duration-150 ${
                    isSelected
                      ? 'bg-[#1C1917] text-[#F7F4EE] border-[#1C1917]'
                      : 'bg-[#F7F4EE] text-[#1C1917] border-[#D4CCBC] hover:bg-[#E7E1D5]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-[11px] tabular-nums font-medium">
                      Ch. {String(ch.number).padStart(2, '0')}
                    </span>
                    {isReady && (
                      <Check className="w-3 h-3 shrink-0" aria-label="Chapter synthesized" />
                    )}
                  </div>
                  <div
                    className={`text-[11px] truncate mt-0.5 ${
                      isSelected ? 'text-[#D6CEBE]' : 'text-[#57534E]'
                    }`}
                  >
                    {ch.editorialWindow}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-b border-[#DDD6C8] space-y-3 bg-[#F7F4EE]">
          <div className="relative">
            <Search
              className="w-3.5 h-3.5 text-[#57534E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search narration or visual cues..."
              aria-label="Search storyboard shots"
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#D4CCBC] rounded-md text-[#1C1917] placeholder:text-[#78716C] focus:outline-2 focus:outline-[#1E3A8A]"
            />
          </div>

          <div className="flex flex-wrap gap-1 p-1 bg-[#EFEBE3] rounded-md">
            {(
              [
                { id: 'all', label: 'Chapter' },
                { id: 'reconstruction', label: 'Reconstruction' },
                { id: 'legend', label: 'Legend' },
                { id: 'pauses', label: 'Pauses' },
              ] as { id: ShotFilter; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`flex-1 px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  filter === tab.id
                    ? 'bg-white text-[#1C1917] shadow-xs'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[540px] overflow-y-auto divide-y divide-[#E2DDD3]">
          {filteredShots.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#57534E]">
              No shots match the current filter.
            </div>
          ) : (
            filteredShots.map((shot) => {
              const isCurrent = shot.id === activeShot.id;
              const isCached = Boolean(cachedShotUrls[shot.id]);
              return (
                <button
                  key={shot.id}
                  type="button"
                  onClick={() => onSelectShot(shot.chapterNumber, shot.id)}
                  className={`w-full text-left px-4 py-3 transition-colors duration-150 ${
                    isCurrent
                      ? 'bg-white'
                      : 'bg-transparent hover:bg-[#F7F4EE]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-mono tabular-nums">
                    <span
                      className={`font-medium ${
                        isCurrent ? 'text-[#1E3A8A]' : 'text-[#1C1917]'
                      }`}
                    >
                      Shot {shot.id}
                    </span>
                    <span className="text-[#57534E]">
                      {shot.timecode} · {shot.durationSeconds}s
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#292524] line-clamp-2 leading-relaxed">
                    {shot.narration}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-[#57534E]">
                    <span>{TRUTH_LABELS[shot.truthCategory]}</span>
                    {isCached && (
                      <span className="inline-flex items-center gap-1 text-[#1E3A8A] font-medium">
                        <Volume2 className="w-3 h-3" aria-hidden="true" />
                        Ready
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Right Canvas: Active Chapter & Shot Workspace */}
      <div className="lg:col-span-8 space-y-6">
        {/* Chapter Masthead */}
        <div className="pb-5 border-b border-[#DDD6C8] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-mono uppercase tracking-wider text-[#57534E] tabular-nums">
              Chapter {String(activeChapter.number).padStart(2, '0')} ·{' '}
              {activeChapter.editorialWindow} · {activeChapter.shots.length}{' '}
              shots · {activeChapter.narrationWords} words
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#1C1917] tracking-tight">
              {activeChapter.title}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-[#F7F4EE] border border-[#D4CCBC] rounded-md text-[#57534E]">
              <span>Pause</span>
              <select
                aria-label="Dramatic pause between chapter shots"
                value={chapterGapSeconds}
                onChange={(e) => onChangeChapterGap(Number.parseFloat(e.target.value))}
                className="font-mono text-xs text-[#1C1917] bg-transparent focus:outline-none"
              >
                <option value={0.5}>0.5s</option>
                <option value={1.0}>1.0s</option>
                <option value={1.5}>1.5s</option>
                <option value={2.0}>2.0s</option>
              </select>
            </label>

            <button
              type="button"
              onClick={() => onExportChapterSrt(activeChapter)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#1C1917] bg-[#F7F4EE] hover:bg-[#EAE4D8] border border-[#D4CCBC] rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <FileText className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Export SRT</span>
            </button>

            {speechEngine === 'browser' ? (
              <button
                type="button"
                onClick={() =>
                  isBrowserSpeaking
                    ? onStopBrowser()
                    : onReadChapterBrowser(activeChapter)
                }
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#F7F4EE] bg-[#1C1917] hover:bg-[#1E3A8A] rounded-md transition-colors whitespace-nowrap shrink-0"
              >
                <Play className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {isBrowserSpeaking ? 'Stop Reading' : 'Read Chapter Aloud'}
                </span>
              </button>
            ) : hasCachedChapter ? (
              <button
                type="button"
                onClick={() => onPlayCachedChapter(activeChapter)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#F7F4EE] bg-[#1E3A8A] hover:bg-[#172E6E] rounded-md transition-colors whitespace-nowrap shrink-0"
              >
                <Play className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Play Chapter Master</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={Boolean(chapterSynthesisProgress)}
                onClick={() => onGenerateChapter(activeChapter)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#1C1917] bg-[#EFEBE3] hover:bg-[#E3DDD0] border border-[#D4CCBC] disabled:opacity-60 rounded-md transition-colors whitespace-nowrap shrink-0"
              >
                {isSynthesizingThisChapter ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    <span className="tabular-nums">
                      Synthesizing {chapterSynthesisProgress.completed}/
                      {chapterSynthesisProgress.total}
                    </span>
                  </>
                ) : (
                  <>
                    <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Synthesize Chapter WAV</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Active Shot Panel */}
        <article className="bg-white border border-[#DDD6C8] rounded-md p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E8E2D6]">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#57534E] font-mono tabular-nums">
              <span className="text-[#1C1917] font-medium">
                Shot {activeShot.id}
              </span>
              <span aria-hidden="true">·</span>
              <span>{activeShot.timecode}</span>
              <span aria-hidden="true">·</span>
              <span>{activeShot.durationSeconds}s target</span>
              <span aria-hidden="true">·</span>
              <span>{activeShot.wordCount} words</span>
              <span aria-hidden="true">·</span>
              <span
                className={
                  activeShot.truthCategory === 'legend'
                    ? 'text-[#9A3412] font-medium'
                    : activeShot.truthCategory === 'reconstruction'
                      ? 'text-[#1E3A8A] font-medium'
                      : 'text-[#1C1917]'
                }
              >
                {TRUTH_LABELS[activeShot.truthCategory]}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!prevShot}
                onClick={() =>
                  prevShot && onSelectShot(prevShot.chapterNumber, prevShot.id)
                }
                aria-label="Previous shot"
                className="p-2 border border-[#D4CCBC] rounded-md text-[#1C1917] hover:bg-[#F7F4EE] disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                disabled={!nextShot}
                onClick={() =>
                  nextShot && onSelectShot(nextShot.chapterNumber, nextShot.id)
                }
                aria-label="Next shot"
                className="p-2 border border-[#D4CCBC] rounded-md text-[#1C1917] hover:bg-[#F7F4EE] disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {activeShot.truthCategory !== 'established' && (
            <div className="flex items-start gap-2.5 p-3.5 bg-[#F7F4EE] border border-[#DDD6C8] rounded text-xs text-[#292524]">
              <AlertTriangle
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  activeShot.truthCategory === 'legend'
                    ? 'text-[#9A3412]'
                    : 'text-[#1E3A8A]'
                }`}
                aria-hidden="true"
              />
              <div>
                <span className="font-semibold">
                  {TRUTH_LABELS[activeShot.truthCategory]}:
                </span>{' '}
                {activeShot.truthCategory === 'legend'
                  ? 'Must be framed explicitly as unverified post-1900 folklore, not authentic investigation evidence.'
                  : 'Non-witnessed historical action; label on screen as DRAMATIC RECONSTRUCTION per episode policy.'}
              </div>
            </div>
          )}

          {/* Verbatim Narration Block */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#57534E]">
                Verbatim Narration
              </h3>
              <label className="inline-flex items-center gap-2 text-xs text-[#57534E] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoAdvance}
                  onChange={(e) => onToggleAutoAdvance(e.target.checked)}
                  className="accent-[#1E3A8A] rounded"
                />
                <span>Auto-advance on playback end</span>
              </label>
            </div>

            <blockquote className="font-serif text-2xl sm:text-[26px] leading-[1.55] text-[#1C1917] max-w-prose">
              {renderNarrationWithPauses(activeShot.narration)}
            </blockquote>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              {speechEngine === 'browser' ? (
                <button
                  type="button"
                  onClick={() =>
                    isBrowserSpeaking
                      ? onStopBrowser()
                      : onReadShotBrowser(activeShot)
                  }
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#F7F4EE] bg-[#1C1917] hover:bg-[#1E3A8A] rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>
                    {isBrowserSpeaking
                      ? 'Stop Reading'
                      : 'Read Aloud (No AI)'}
                  </span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={isSynthesizingActiveShot}
                    onClick={() =>
                      hasCachedShot
                        ? onPlayCachedShot(activeShot)
                        : onGenerateShot(activeShot)
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#F7F4EE] bg-[#1C1917] hover:bg-[#1E3A8A] disabled:opacity-60 rounded-md transition-colors whitespace-nowrap shrink-0"
                  >
                    {isSynthesizingActiveShot ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                        <span>Synthesizing Shot...</span>
                      </>
                    ) : hasCachedShot ? (
                      <>
                        <Play className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Load & Play Shot Audio</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Generate Shot Narration</span>
                      </>
                    )}
                  </button>

                  {hasCachedShot && (
                    <button
                      type="button"
                      disabled={isSynthesizingActiveShot}
                      onClick={() => onGenerateShot(activeShot)}
                      className="px-3.5 py-2 text-xs font-medium text-[#1C1917] bg-[#F7F4EE] hover:bg-[#EAE4D8] border border-[#D4CCBC] rounded-md transition-colors whitespace-nowrap shrink-0"
                    >
                      Re-synthesize with Current Voice
                    </button>
                  )}
                </>
              )}

              <button
                type="button"
                onClick={() =>
                  onSendToVoiceLab(
                    activeShot.narration,
                    `Shot ${activeShot.id} Adaptation`,
                  )
                }
                className="px-3.5 py-2 text-xs font-medium text-[#57534E] hover:text-[#1C1917] underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
              >
                Open in Voice Lab
              </button>
            </div>
          </div>

          {/* Archival Plate */}
          <EditorialCanvas
            shot={activeShot}
            storyId={storyboard.id}
            storyTitle={storyboard.episodeTitle}
            chapterTitle={activeChapter.title}
            chapterShotCount={activeChapter.shots.length}
          />

          {/* Production Specification Grid */}
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 pt-2 border-t border-[#E8E2D6] text-sm">
            <div>
              <dt className="text-xs font-mono uppercase tracking-wider text-[#57534E]">
                Visual Direction
              </dt>
              <dd className="mt-1 text-[#1C1917] leading-relaxed">
                {activeShot.visual}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-mono uppercase tracking-wider text-[#57534E]">
                Camera Framing
              </dt>
              <dd className="mt-1 text-[#1C1917] leading-relaxed">
                {activeShot.camera}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-mono uppercase tracking-wider text-[#57534E]">
                Editorial Transition
              </dt>
              <dd className="mt-1 text-[#1C1917] leading-relaxed">
                {activeShot.transition}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-mono uppercase tracking-wider text-[#57534E]">
                Audio & Score Cue
              </dt>
              <dd className="mt-1 text-[#1C1917] leading-relaxed">
                {activeShot.audio}
              </dd>
            </div>
          </dl>
        </article>
      </div>
    </div>
  );
}
