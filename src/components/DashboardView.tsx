import { useRef, useState, type DragEvent } from 'react';
import {
  ArrowRight,
  Check,
  Download,
  Eye,
  FilePlus2,
  FileText,
  Loader2,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { StorySummary } from '../types/storyboard';

interface DashboardViewProps {
  stories: StorySummary[];
  activeStoryId: string;
  onSelectStory: (storyId: string) => void;
  onUploadStory: (payload: {
    filename: string;
    content: string;
  }) => Promise<void>;
  onDeleteStory: (storyId: string) => Promise<void>;
  isUploading: boolean;
}

const SAMPLE_MD_TEMPLATE = `# THE MIDNIGHT FOGHORN
**Subtitle:** A Coastal Mystery Story
**Author:** Ember & Echo

## Chapter 01 — The Last Watch
The fog settled over St. Abbs Head shortly after dusk, swallowing the stone jetty and the lower cliff road in grey silence. [PAUSE - 2 SECONDS]

Inside the keeper's watch room, the brass chronometer ticked with steady, unhurried precision. Every entry in the logbook had been written in neat black ink.

## Chapter 02 — An Unanswered Signal
At half past eleven, the coastal lookout spotted the offshore beam flicker twice and go dark. [PAUSE - 3 SECONDS] By dawn, only the wind remained to answer the sea.
`;

export function DashboardView({
  stories,
  activeStoryId,
  onSelectStory,
  onUploadStory,
  onDeleteStory,
  isUploading,
}: DashboardViewProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draftFilename, setDraftFilename] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewStory, setPreviewStory] = useState<{
    id: string;
    filename: string;
    content: string;
  } | null>(null);
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setLocalError(null);
    setStatusNotice(null);

    const files = Array.from(fileList);
    let addedCount = 0;

    for (const file of files) {
      if (!/\.(md|markdown|txt)$/i.test(file.name)) {
        setLocalError(
          `Skipped "${file.name}": please upload .md, .markdown, or .txt files.`,
        );
        continue;
      }
      try {
        const content = await file.text();
        await onUploadStory({
          filename: file.name,
          content,
        });
        addedCount += 1;
      } catch (err) {
        setLocalError(
          err instanceof Error ? err.message : `Failed to import ${file.name}.`,
        );
      }
    }

    if (addedCount > 0) {
      setStatusNotice(
        addedCount === 1
          ? 'Added 1 Markdown story to the Ember & Echo library.'
          : `Added ${addedCount} Markdown stories to the Ember & Echo library.`,
      );
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    void handleFiles(e.dataTransfer.files);
  };

  const handleSaveDraft = async () => {
    setLocalError(null);
    setStatusNotice(null);
    if (!draftContent.trim()) {
      setLocalError('Enter Markdown story text before saving.');
      return;
    }
    const firstHeadingMatch = draftContent.match(/^#\s+(.+)$/m);
    const derivedName =
      draftFilename.trim() ||
      (firstHeadingMatch ? firstHeadingMatch[1].trim() : `story-${Date.now()}`);
    try {
      await onUploadStory({
        filename: derivedName.endsWith('.md')
          ? derivedName
          : `${derivedName}.md`,
        content: draftContent,
      });
      setDraftFilename('');
      setDraftContent('');
      setComposerOpen(false);
      setStatusNotice('Saved new Markdown story to the library.');
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : 'Unable to save Markdown story.',
      );
    }
  };

  const handleOpenPreview = async (storyId: string) => {
    setLoadingPreviewId(storyId);
    setLocalError(null);
    try {
      const res = await fetch(`/api/stories/${encodeURIComponent(storyId)}/raw`);
      const payload = (await res.json()) as {
        id?: string;
        filename?: string;
        content?: string;
        error?: string;
      };
      if (!res.ok || !payload.content) {
        throw new Error(payload.error || 'Unable to load Markdown source.');
      }
      setPreviewStory({
        id: payload.id || storyId,
        filename: payload.filename || `${storyId}.md`,
        content: payload.content,
      });
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : 'Unable to read Markdown source.',
      );
    } finally {
      setLoadingPreviewId(null);
    }
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_MD_TEMPLATE], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ember-and-echo-story-template.md';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const totalLibraryWords = stories.reduce((sum, s) => sum + s.totalWords, 0);
  const totalLibraryShots = stories.reduce((sum, s) => sum + s.totalShots, 0);

  return (
    <div className="space-y-8">
      <section className="pb-5 border-b border-[#DDD6C8] flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="text-xs font-mono uppercase tracking-wider text-[#57534E] tabular-nums">
            Ember & Echo · Story Dashboard · {stories.length} files ·{' '}
            {totalLibraryShots} beats · {totalLibraryWords.toLocaleString()} words
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#1C1917]">
            Markdown Story Library
          </h2>
          <p className="text-sm text-[#57534E] max-w-2xl leading-relaxed">
            Upload or write Markdown (<code className="font-mono text-xs">.md</code>) manuscripts here. Ember & Echo parses chapters, narration beats, and scripted <code className="font-mono text-xs">[PAUSE]</code> markers for deep-pitch storytelling synthesis.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#1C1917] bg-[#EFEBE3] hover:bg-[#E3DDD0] border border-[#D4CCBC] rounded-md transition-colors whitespace-nowrap shrink-0 self-start lg:self-end"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Download .md Template</span>
        </button>
      </section>

      {localError && (
        <div
          role="alert"
          className="p-4 bg-white border border-[#9A3412]/40 rounded-md flex items-center justify-between gap-4 text-sm text-[#9A3412]"
        >
          <span>{localError}</span>
          <button
            type="button"
            onClick={() => setLocalError(null)}
            aria-label="Dismiss error"
            className="text-[#57534E] hover:text-[#1C1917]"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {statusNotice && (
        <div className="p-4 bg-white border border-[#1E3A8A]/35 rounded-md flex items-center justify-between gap-4 text-sm text-[#1E3A8A]">
          <span className="inline-flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{statusNotice}</span>
          </span>
          <button
            type="button"
            onClick={() => setStatusNotice(null)}
            aria-label="Dismiss notice"
            className="text-[#57534E] hover:text-[#1C1917]"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Add .md File / Paste Markdown */}
        <section className="lg:col-span-5 bg-white border border-[#DDD6C8] rounded-md p-6 space-y-5">
          <div className="space-y-1">
            <h3 className="font-serif text-2xl font-semibold text-[#1C1917]">
              Add Story Files
            </h3>
            <p className="text-xs text-[#57534E] leading-relaxed">
              Supports both structured scene storyboards and standard Markdown narratives (<code className="font-mono"># Title</code>, <code className="font-mono">## Chapters</code>, paragraphs).
            </p>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border border-dashed rounded-md p-7 text-center transition-colors ${
              isDragging
                ? 'border-[#1E3A8A] bg-[#1E3A8A]/5'
                : 'border-[#C5BDB0] bg-[#F7F4EE]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.markdown,.txt,text/markdown,text/plain"
              multiple
              onChange={(e) => void handleFiles(e.target.files)}
              className="hidden"
              id="md-story-upload"
            />
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-md bg-[#EFEBE3] border border-[#D4CCBC] flex items-center justify-center mx-auto text-[#1C1917]">
                {isUploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                ) : (
                  <Upload className="w-5 h-5" aria-hidden="true" />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-[#1C1917]">
                  Drop .md files here
                </p>
                <p className="text-xs text-[#57534E]">
                  Stored on the server under <code className="font-mono">public/stories/</code>
                </p>
              </div>
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#F7F4EE] bg-[#1C1917] hover:bg-[#1E3A8A] disabled:opacity-60 rounded-md transition-colors"
              >
                <FilePlus2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Choose Markdown Files</span>
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-[#E8E2D6] space-y-3">
            <button
              type="button"
              onClick={() => setComposerOpen((v) => !v)}
              className="text-xs font-medium text-[#1E3A8A] hover:underline underline-offset-4"
            >
              {composerOpen
                ? 'Hide Markdown Composer'
                : 'Or write / paste a Markdown story directly'}
            </button>

            {composerOpen && (
              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <label
                    htmlFor="draft-md-filename"
                    className="block text-xs font-medium text-[#57534E]"
                  >
                    Filename (optional)
                  </label>
                  <input
                    id="draft-md-filename"
                    type="text"
                    value={draftFilename}
                    onChange={(e) => setDraftFilename(e.target.value)}
                    placeholder="e.g. the-midnight-foghorn.md"
                    className="w-full px-3 py-2 text-xs font-mono bg-[#F7F4EE] border border-[#D4CCBC] rounded-md text-[#1C1917] focus:outline-2 focus:outline-[#1E3A8A]"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="draft-md-content"
                    className="block text-xs font-medium text-[#57534E]"
                  >
                    Markdown Story Content
                  </label>
                  <textarea
                    id="draft-md-content"
                    rows={8}
                    value={draftContent}
                    onChange={(e) => setDraftContent(e.target.value)}
                    placeholder={'# Story Title\n\n## Chapter 01 — Beginning\nWrite your atmospheric narration here. [PAUSE - 2 SECONDS]'}
                    className="w-full p-3 text-xs font-mono leading-relaxed bg-[#F7F4EE] border border-[#D4CCBC] rounded-md text-[#1C1917] focus:outline-2 focus:outline-[#1E3A8A]"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDraftContent(SAMPLE_MD_TEMPLATE)}
                    className="px-3 py-1.5 text-xs text-[#57534E] hover:text-[#1C1917] border border-[#D4CCBC] rounded-md"
                  >
                    Fill Sample
                  </button>
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => void handleSaveDraft()}
                    className="px-4 py-1.5 text-xs font-semibold text-[#F7F4EE] bg-[#1C1917] hover:bg-[#1E3A8A] disabled:opacity-60 rounded-md transition-colors"
                  >
                    Save .md Story
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Available Stories Ledger */}
        <section className="lg:col-span-7 border border-[#DDD6C8] bg-[#EFEBE3]/60 rounded-md overflow-hidden">
          <div className="p-5 border-b border-[#DDD6C8] flex items-center justify-between">
            <div>
              <h3 className="font-serif text-2xl font-semibold text-[#1C1917]">
                Available Manuscripts
              </h3>
              <p className="text-xs text-[#57534E]">
                Select any Markdown file to load its chapters into the narration studio.
              </p>
            </div>
            <span className="font-mono text-xs tabular-nums text-[#57534E]">
              {stories.length} stories
            </span>
          </div>

          <div className="divide-y divide-[#DDD6C8]">
            {stories.map((story) => {
              const isActive = story.id === activeStoryId;
              return (
                <div
                  key={story.id}
                  className={`p-5 transition-colors ${
                    isActive ? 'bg-white' : 'bg-[#F7F4EE]/70 hover:bg-white'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#57534E] tabular-nums">
                        <span className="inline-flex items-center gap-1 text-[#1C1917]">
                          <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                          {story.filename}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {story.format === 'storyboard'
                            ? 'Production Storyboard'
                            : 'Markdown Narrative'}
                        </span>
                        {isActive && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#1E3A8A] font-semibold">
                              Active in Studio
                            </span>
                          </>
                        )}
                      </div>

                      <h4 className="font-serif text-2xl font-semibold text-[#1C1917]">
                        {story.episodeTitle}
                      </h4>

                      <div className="text-xs text-[#57534E] font-mono tabular-nums">
                        {story.chaptersCount} chapters · {story.totalShots}{' '}
                        {story.format === 'storyboard' ? 'shots' : 'beats'} ·{' '}
                        {story.totalWords.toLocaleString()} words
                        {story.targetEdit ? ` · ${story.targetEdit}` : ''}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => void handleOpenPreview(story.id)}
                        disabled={loadingPreviewId === story.id}
                        aria-label={`Inspect ${story.filename}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#1C1917] bg-[#F7F4EE] hover:bg-[#EAE4D8] border border-[#D4CCBC] rounded-md transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>View .md</span>
                      </button>

                      {!story.isBuiltIn && (
                        <button
                          type="button"
                          disabled={deletingId === story.id}
                          onClick={() => {
                            void (async () => {
                              setDeletingId(story.id);
                              setLocalError(null);
                              try {
                                await onDeleteStory(story.id);
                              } catch (err) {
                                setLocalError(
                                  err instanceof Error
                                    ? err.message
                                    : 'Unable to delete story.',
                                );
                              } finally {
                                setDeletingId(null);
                              }
                            })();
                          }}
                          aria-label={`Delete ${story.filename}`}
                          className="p-2 text-[#9A3412] bg-[#F7F4EE] hover:bg-[#9A3412]/10 border border-[#D4CCBC] rounded-md transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onSelectStory(story.id)}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                          isActive
                            ? 'bg-[#1E3A8A] text-[#F7F4EE]'
                            : 'bg-[#1C1917] hover:bg-[#1E3A8A] text-[#F7F4EE]'
                        }`}
                      >
                        <span>{isActive ? 'Open Studio' : 'Read Story'}</span>
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Markdown Source Preview Modal */}
      {previewStory && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Markdown source for ${previewStory.filename}`}
          className="fixed inset-0 z-50 bg-[#1C1917]/55 backdrop-blur-[2px] flex items-center justify-center p-4 sm:p-6"
        >
          <div className="bg-[#F7F4EE] border border-[#DDD6C8] rounded-md max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-[#DDD6C8] flex items-center justify-between gap-4 bg-[#EFEBE3]">
              <div>
                <div className="text-xs font-mono text-[#57534E]">
                  public/stories/{previewStory.filename}
                </div>
                <h3 className="font-serif text-xl font-semibold text-[#1C1917]">
                  Markdown Source Inspection
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewStory(null)}
                aria-label="Close source preview"
                className="p-2 text-[#57534E] hover:text-[#1C1917] rounded-md"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <pre className="p-6 overflow-auto text-xs font-mono leading-relaxed text-[#1C1917] whitespace-pre-wrap">
              {previewStory.content}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
