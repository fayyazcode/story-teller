import { Download, Loader2, Play, Sparkles, Square, Volume2 } from 'lucide-react';
import { useState } from 'react';
import type { PrebuiltVoiceName, SynthesizedTake } from '../types/storyboard';
import { VOICE_PRESETS } from '../data/voicePresets';
import {
  exportBroadcast48kWav,
  formatSecondsClock,
} from '../utils/wavUtils';

interface VoiceLabViewProps {
  initialText: string;
  initialLabel: string;
  voiceName: PrebuiltVoiceName;
  stylePrompt: string;
  onChangeVoice: (voice: PrebuiltVoiceName, style?: string) => void;
  onChangeStyle: (style: string) => void;
  onSynthesizeCustom: (opts: {
    text: string;
    label: string;
    voiceName: PrebuiltVoiceName;
    style: string;
    preservePauses: boolean;
  }) => Promise<void>;
  isGenerating: boolean;
  takes: SynthesizedTake[];
  onPlayTake: (take: SynthesizedTake) => void;
  studioTtsAvailable: boolean;
  isBrowserSpeaking: boolean;
  onReadBrowserText: (text: string, label: string) => void;
  onStopBrowser: () => void;
}

const SAMPLE_EXCERPTS = [
  {
    label: 'Opening Cold Open (Shot 01.01)',
    text: 'December 26th, 1900. A small ship approaches a remote island off the western coast of Scotland. Its crew is expecting a routine visit.',
  },
  {
    label: 'The Central Question (Shot 01.10)',
    text: 'What happened to the three lighthouse keepers of the Flannan Isles? [PAUSE - 2 SECONDS]',
  },
  {
    label: 'Closing Epilogue (Shot 09.11)',
    text: 'in a place where nobody survived to tell the story. [PAUSE - 3 SECONDS] Three keepers. One lighthouse. And an ocean that kept its secrets.',
  },
];

export function VoiceLabView({
  initialText,
  initialLabel,
  voiceName,
  stylePrompt,
  onChangeVoice,
  onChangeStyle,
  onSynthesizeCustom,
  isGenerating,
  takes,
  onPlayTake,
  studioTtsAvailable,
  isBrowserSpeaking,
  onReadBrowserText,
  onStopBrowser,
}: VoiceLabViewProps) {
  const [label, setLabel] = useState(initialLabel || 'Custom Narration Take');
  const [text, setText] = useState(
    initialText || SAMPLE_EXCERPTS[0].text,
  );
  const [preservePauses, setPreservePauses] = useState(true);

  const insertCue = (cue: string) => {
    setText((prev) => `${prev.trimEnd()} ${cue} `);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <section className="lg:col-span-7 bg-white border border-[#DDD6C8] rounded-md p-6 sm:p-8 space-y-6">
        <div className="pb-4 border-b border-[#E8E2D6] space-y-1">
          <div className="text-xs font-mono uppercase tracking-wider text-[#57534E]">
            Voice Design &amp; Pacing Studio · Offline Speech &amp; Optional WAV
          </div>
          <h2 className="font-serif text-3xl font-semibold text-[#1C1917]">
            Narration Voice Lab
          </h2>
          <p className="text-sm text-[#57534E] leading-relaxed">
            Test deep-pitch documentary phrasing and scripted silent intervals offline with Browser Voice, or export downloadable WAV masters when Studio WAV is configured.
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="lab-take-label"
                className="block text-xs font-medium text-[#57534E]"
              >
                Take Label
              </label>
              <input
                id="lab-take-label"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F7F4EE] border border-[#D4CCBC] rounded-md text-[#1C1917] focus:outline-2 focus:outline-[#1E3A8A]"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="lab-voice-select"
                className="block text-xs font-medium text-[#57534E]"
              >
                Studio WAV Voice Persona
              </label>
              <select
                id="lab-voice-select"
                value={voiceName}
                onChange={(e) => {
                  const v = e.target.value as PrebuiltVoiceName;
                  const preset = VOICE_PRESETS.find((p) => p.voiceName === v);
                  onChangeVoice(v, preset?.style);
                }}
                className="w-full px-3 py-2 text-sm bg-[#F7F4EE] border border-[#D4CCBC] rounded-md text-[#1C1917] focus:outline-2 focus:outline-[#1E3A8A]"
              >
                {VOICE_PRESETS.map((p) => (
                  <option key={p.id} value={p.voiceName}>
                    {p.label} ({p.voiceName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="lab-style-input"
              className="block text-xs font-medium text-[#57534E]"
            >
              Vocal Style &amp; Pitch Direction
            </label>
            <input
              id="lab-style-input"
              type="text"
              value={stylePrompt}
              onChange={(e) => onChangeStyle(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#F7F4EE] border border-[#D4CCBC] rounded-md text-[#1C1917] focus:outline-2 focus:outline-[#1E3A8A]"
            />
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="lab-script-textarea"
                className="text-xs font-medium text-[#57534E]"
              >
                Narration Script
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => insertCue('[PAUSE - 2 SECONDS]')}
                  className="px-2 py-1 text-[11px] font-mono border border-[#D4CCBC] bg-[#F7F4EE] hover:bg-[#EAE4D8] rounded text-[#1C1917]"
                >
                  + [PAUSE - 2 SECONDS]
                </button>
                <button
                  type="button"
                  onClick={() => insertCue('[PAUSE - 3 SECONDS]')}
                  className="px-2 py-1 text-[11px] font-mono border border-[#D4CCBC] bg-[#F7F4EE] hover:bg-[#EAE4D8] rounded text-[#1C1917]"
                >
                  + [PAUSE - 3 SECONDS]
                </button>
                <button
                  type="button"
                  onClick={() => insertCue('<breath>')}
                  className="px-2 py-1 text-[11px] font-mono border border-[#D4CCBC] bg-[#F7F4EE] hover:bg-[#EAE4D8] rounded text-[#1C1917]"
                >
                  + &lt;breath&gt;
                </button>
              </div>
            </div>

            <textarea
              id="lab-script-textarea"
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full p-4 font-serif text-lg leading-relaxed bg-[#F7F4EE] border border-[#D4CCBC] rounded-md text-[#1C1917] focus:outline-2 focus:outline-[#1E3A8A]"
            />

            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <label className="inline-flex items-center gap-2 text-xs text-[#57534E] cursor-pointer">
                <input
                  type="checkbox"
                  checked={preservePauses}
                  onChange={(e) => setPreservePauses(e.target.checked)}
                  className="accent-[#1E3A8A]"
                />
                <span>Honor exact silent intervals for [PAUSE] markers</span>
              </label>

              <span className="font-mono text-xs tabular-nums text-[#57534E]">
                {text.length} / 4500 chars
              </span>
            </div>
          </div>

          <div className="pt-3 flex flex-wrap items-center justify-between gap-4 border-t border-[#E8E2D6]">
            <div className="flex flex-wrap items-center gap-2">
              {SAMPLE_EXCERPTS.map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  onClick={() => {
                    setText(sample.text);
                    setLabel(sample.label);
                  }}
                  className="px-2.5 py-1 text-xs text-[#57534E] hover:text-[#1C1917] bg-[#F7F4EE] hover:bg-[#EAE4D8] border border-[#DDD6C8] rounded transition-colors"
                >
                  {sample.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isBrowserSpeaking ? (
                <button
                  type="button"
                  onClick={onStopBrowser}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#F7F4EE] bg-[#9A3412] hover:bg-[#7C2D12] rounded-md transition-colors whitespace-nowrap"
                >
                  <Square className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                  <span>Stop Reading</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!text.trim()}
                  onClick={() => onReadBrowserText(text, label)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#F7F4EE] bg-[#1C1917] hover:bg-[#1E3A8A] disabled:opacity-60 rounded-md transition-colors whitespace-nowrap"
                >
                  <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Read Aloud (No AI)</span>
                </button>
              )}

              <button
                type="button"
                disabled={isGenerating || !text.trim() || !studioTtsAvailable}
                title={
                  studioTtsAvailable
                    ? 'Export optional Studio WAV master'
                    : 'Optional Studio WAV requires GEMINI_API_KEY on server'
                }
                onClick={() =>
                  void onSynthesizeCustom({
                    text,
                    label,
                    voiceName,
                    style: stylePrompt,
                    preservePauses,
                  })
                }
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#1C1917] bg-[#EFEBE3] hover:bg-[#E5DFD3] border border-[#D4CCBC] disabled:opacity-50 rounded-md transition-colors whitespace-nowrap shrink-0"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    <span>Rendering WAV...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>
                      {studioTtsAvailable ? 'Synthesize Studio WAV' : 'Studio WAV Unavailable'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Right Rail: Recorded Takes History */}
      <aside className="lg:col-span-5 border border-[#DDD6C8] bg-[#EFEBE3]/70 rounded-md overflow-hidden">
        <div className="p-5 border-b border-[#DDD6C8] flex items-center justify-between">
          <div>
            <h3 className="font-serif text-xl font-semibold text-[#1C1917]">
              Session Voice Takes
            </h3>
            <p className="text-xs text-[#57534E]">
              Compare synthesized takes and export 24kHz or 48kHz YouTube-ready WAV masters.
            </p>
          </div>
          <span className="font-mono text-xs tabular-nums text-[#57534E]">
            {takes.length} takes
          </span>
        </div>

        <div className="divide-y divide-[#DDD6C8] max-h-[540px] overflow-y-auto">
          {takes.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Volume2
                className="w-6 h-6 text-[#78716C] mx-auto"
                aria-hidden="true"
              />
              <p className="text-sm font-medium text-[#1C1917]">
                No takes synthesized yet
              </p>
              <p className="text-xs text-[#57534E] max-w-xs mx-auto">
                Generate any storyboard shot or custom script excerpt to audition it here.
              </p>
            </div>
          ) : (
            takes.map((take) => (
              <div key={take.id} className="p-4 bg-[#F7F4EE]/70 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#1C1917] truncate">
                      {take.label}
                    </div>
                    <div className="text-xs font-mono tabular-nums text-[#57534E]">
                      {take.voiceName} · {formatSecondsClock(take.durationSeconds)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onPlayTake(take)}
                      aria-label={`Play ${take.label}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#F7F4EE] bg-[#1C1917] hover:bg-[#1E3A8A] rounded transition-colors"
                    >
                      <Play className="w-3 h-3" aria-hidden="true" />
                      <span>Play</span>
                    </button>
                    <a
                      href={take.audioUrl}
                      download={`${take.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.wav`}
                      aria-label={`Download ${take.label} 24kHz WAV`}
                      title="Download 24kHz WAV"
                      className="p-1.5 border border-[#D4CCBC] bg-white hover:bg-[#EAE4D8] rounded text-[#1C1917] transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        void (async () => {
                          const wav48 = await exportBroadcast48kWav(take.blob);
                          const url48 = URL.createObjectURL(wav48);
                          const a = document.createElement('a');
                          a.href = url48;
                          a.download = `${take.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-48khz-youtube.wav`;
                          a.click();
                          setTimeout(() => URL.revokeObjectURL(url48), 2000);
                        })();
                      }}
                      className="px-2 py-1.5 text-[11px] font-mono border border-[#1E3A8A] bg-[#1E3A8A] hover:bg-[#172E6E] rounded text-[#F7F4EE] transition-colors whitespace-nowrap"
                    >
                      48kHz
                    </button>
                  </div>
                </div>
                <p className="text-xs text-[#57534E] line-clamp-2 leading-relaxed">
                  {take.text}
                </p>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
