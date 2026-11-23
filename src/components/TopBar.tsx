import { Loader2, Volume2 } from 'lucide-react';

export type StudioView =
  | 'dashboard'
  | 'storyboard'
  | 'voice-lab'
  | 'evidence'
  | 'checklist';

interface TopBarProps {
  activeView: StudioView;
  onSelectView: (view: StudioView) => void;
  onPrimaryAction: () => void;
  isGenerating: boolean;
  hasActiveAudio: boolean;
  isPlaying: boolean;
}

const NAV_ITEMS: { id: StudioView; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'storyboard', label: 'Storyboard' },
  { id: 'voice-lab', label: 'Voice Lab' },
  { id: 'evidence', label: 'Evidence Map' },
  { id: 'checklist', label: 'Checklist' },
];

export function TopBar({
  activeView,
  onSelectView,
  onPrimaryAction,
  isGenerating,
  hasActiveAudio,
  isPlaying,
}: TopBarProps) {
  const primaryLabel = isGenerating
    ? 'Synthesizing...'
    : isPlaying
      ? 'Pause Narration'
      : hasActiveAudio
        ? 'Play Narration'
        : 'Generate Narration';

  return (
    <header className="sticky top-0 z-30 bg-[#F7F4EE]/95 backdrop-blur-sm border-b border-[#DDD6C8]">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-10 h-16 flex items-center justify-between gap-8">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onSelectView('dashboard');
          }}
          className="font-serif text-xl lg:text-2xl font-semibold tracking-tight text-[#1C1917] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1E3A8A]"
        >
          Ember &amp; Echo
        </a>

        <nav
          aria-label="Primary studio navigation"
          className="hidden md:flex items-center gap-7"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                className={`relative py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1E3A8A] ${
                  isActive
                    ? 'text-[#1C1917]'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                {item.label}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 bottom-0 h-[1.5px] bg-[#1E3A8A] transition-opacity duration-150 ${
                    isActive ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              </button>
            );
          })}
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onPrimaryAction}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold tracking-wide text-[#F7F4EE] bg-[#1C1917] hover:bg-[#1E3A8A] disabled:opacity-60 disabled:cursor-not-allowed rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A8A]"
          >
            {isGenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>{primaryLabel}</span>
          </button>
        </div>
      </div>

      <nav
        aria-label="Mobile studio navigation"
        className="flex md:hidden items-center gap-5 px-6 pb-2.5 overflow-x-auto border-t border-[#E8E2D6]"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectView(item.id)}
              className={`py-1.5 text-xs font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                isActive
                  ? 'border-[#1E3A8A] text-[#1C1917]'
                  : 'border-transparent text-[#57534E]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
