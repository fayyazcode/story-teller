import { useEffect, useRef, useState } from 'react';
import {
  Download,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Square,
} from 'lucide-react';
import type { PrebuiltVoiceName } from '../types/storyboard';
import { VOICE_PRESETS } from '../data/voicePresets';
import {
  exportBroadcast48kWav,
  formatSecondsClock,
} from '../utils/wavUtils';

export type SpeechEngineMode = 'browser' | 'studio';

interface VoiceControlBarProps {
  speechEngine: SpeechEngineMode;
  onChangeSpeechEngine: (engine: SpeechEngineMode) => void;
  studioTtsAvailable: boolean;
  browserVoices: SpeechSynthesisVoice[];
  selectedBrowserVoiceURI: string;
  onChangeBrowserVoiceURI: (uri: string) => void;
  browserPitch: number;
  onChangeBrowserPitch: (pitch: number) => void;
  browserRate: number;
  onChangeBrowserRate: (rate: number) => void;
  isBrowserSpeaking: boolean;
  onPlayBrowserActive: () => void;
  onStopBrowser: () => void;
  audioUrl: string | null;
  audioBlob: Blob | null;
  audioLabel: string;
  voiceName: PrebuiltVoiceName;
  stylePrompt: string;
  onChangeVoice: (voiceName: PrebuiltVoiceName, defaultStyle?: string) => void;
  onChangeStyle: (style: string) => void;
  isPlaying: boolean;
  onPlayingChange: (playing: boolean) => void;
  onEnded?: () => void;
  downloadFilename?: string;
  autoPlayNonce?: number;
  togglePlayNonce?: number;
}

export function VoiceControlBar({
  speechEngine,
  onChangeSpeechEngine,
  studioTtsAvailable,
  browserVoices,
  selectedBrowserVoiceURI,
  onChangeBrowserVoiceURI,
  browserPitch,
  onChangeBrowserPitch,
  browserRate,
  onChangeBrowserRate,
  isBrowserSpeaking,
  onPlayBrowserActive,
  onStopBrowser,
  audioUrl,
  audioBlob,
  audioLabel,
  voiceName,
  stylePrompt,
  onChangeVoice,
  onChangeStyle,
  isPlaying,
  onPlayingChange,
  onEnded,
  downloadFilename = 'ember-and-echo-narration.wav',
  autoPlayNonce = 0,
  togglePlayNonce = 0,
}: VoiceControlBarProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  const ensureAudioGraph = () => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    if (!audioCtxRef.current) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      const source = ctx.createMediaElementSource(audioEl);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
    }
    if (audioCtxRef.current.state === 'suspended') {
      void audioCtxRef.current.resume();
    }
  };

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    audioEl.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    if (!audioUrl) {
      onPlayingChange(false);
    }
  }, [audioUrl, onPlayingChange]);

  useEffect(() => {
    if (!autoPlayNonce || !audioUrl) return;
    const audioEl = audioRef.current;
    if (!audioEl) return;
    ensureAudioGraph();
    audioEl.currentTime = 0;
    void audioEl
      .play()
      .then(() => onPlayingChange(true))
      .catch(() => onPlayingChange(false));
  }, [autoPlayNonce, audioUrl, onPlayingChange]);

  useEffect(() => {
    if (!togglePlayNonce || !audioUrl) return;
    const audioEl = audioRef.current;
    if (!audioEl) return;
    ensureAudioGraph();
    if (audioEl.paused) {
      void audioEl
        .play()
        .then(() => onPlayingChange(true))
        .catch(() => onPlayingChange(false));
    } else {
      audioEl.pause();
      onPlayingChange(false);
    }
  }, [togglePlayNonce, audioUrl, onPlayingChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawStatic = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      const bars = 44;
      const gap = 3;
      const barWidth = (width - (bars - 1) * gap) / bars;
      ctx.fillStyle = audioUrl ? '#C5BDB0' : '#DDD6C8';
      for (let i = 0; i < bars; i++) {
        const h = audioUrl ? 4 + ((i * 7) % 10) : 3;
        const x = i * (barWidth + gap);
        const y = (height - h) / 2;
        ctx.fillRect(x, y, barWidth, h);
      }
    };

    if (!isPlaying || !analyserRef.current || speechEngine !== 'studio') {
      drawStatic();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const analyser = analyserRef.current;
    const data = new Uint8Array(analyser.frequencyBinCount);

    const renderFrame = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      analyser.getByteFrequencyData(data);

      const bars = 44;
      const gap = 3;
      const barWidth = (width - (bars - 1) * gap) / bars;

      for (let i = 0; i < bars; i++) {
        const binIndex = Math.min(
          data.length - 1,
          Math.floor((i / bars) * (data.length * 0.75)),
        );
        const amplitude = data[binIndex] / 255;
        const h = Math.max(3, amplitude * (height - 4));
        const x = i * (barWidth + gap);
        const y = (height - h) / 2;
        ctx.fillStyle = amplitude > 0.42 ? '#1E3A8A' : '#57534E';
        ctx.fillRect(x, y, barWidth, h);
      }
      rafRef.current = requestAnimationFrame(renderFrame);
    };

    rafRef.current = requestAnimationFrame(renderFrame);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPlaying, audioUrl, speechEngine]);

  const togglePlay = async () => {
    const audioEl = audioRef.current;
    if (!audioEl || !audioUrl) return;
    ensureAudioGraph();
    if (audioEl.paused) {
      try {
        await audioEl.play();
        onPlayingChange(true);
      } catch {
        onPlayingChange(false);
      }
    } else {
      audioEl.pause();
      onPlayingChange(false);
    }
  };

  const handleRestart = async () => {
    const audioEl = audioRef.current;
    if (!audioEl || !audioUrl) return;
    ensureAudioGraph();
    audioEl.currentTime = 0;
    try {
      await audioEl.play();
      onPlayingChange(true);
    } catch {
      onPlayingChange(false);
    }
  };

  const handleSeek = (nextTime: number) => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    audioEl.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const cycleRate = () => {
    const rates = [0.9, 1.0, 1.1];
    const idx = rates.indexOf(playbackRate);
    setPlaybackRate(rates[(idx + 1) % rates.length]);
  };

  const activeBrowserVoice = browserVoices.find(
    (v) => v.voiceURI === selectedBrowserVoiceURI,
  );

  return (
    <section
      aria-label="Narration audio console"
      className="border border-[#DDD6C8] bg-[#EFEBE3] rounded-md"
    >
      <audio
        ref={audioRef}
        src={audioUrl ?? undefined}
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration || 0);
        }}
        onTimeUpdate={(e) => {
          setCurrentTime(e.currentTarget.currentTime || 0);
        }}
        onEnded={() => {
          onPlayingChange(false);
          onEnded?.();
        }}
        onPlay={() => onPlayingChange(true)}
        onPause={() => onPlayingChange(false)}
      />

      <div className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {speechEngine === 'browser' ? (
            <>
              <button
                type="button"
                onClick={isBrowserSpeaking ? onStopBrowser : onPlayBrowserActive}
                aria-label={isBrowserSpeaking ? 'Stop reading' : 'Read aloud'}
                className="w-10 h-10 rounded-md bg-[#1C1917] hover:bg-[#1E3A8A] text-[#F7F4EE] flex items-center justify-center transition-colors duration-150 shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A8A]"
              >
                {isBrowserSpeaking ? (
                  <Square className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5" aria-hidden="true" />
                )}
              </button>
              <div className="min-w-0">
                <div className="text-sm font-medium text-[#1C1917] truncate max-w-[260px] sm:max-w-[340px]">
                  {audioLabel}
                </div>
                <div className="text-xs text-[#57534E] truncate max-w-[340px]">
                  Browser Voice (Offline · No AI) · Pitch {browserPitch.toFixed(2)} · Rate {browserRate.toFixed(2)}x
                </div>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={togglePlay}
                disabled={!audioUrl}
                aria-label={isPlaying ? 'Pause narration' : 'Play narration'}
                className="w-10 h-10 rounded-md bg-[#1C1917] hover:bg-[#1E3A8A] disabled:bg-[#C8C0B2] text-[#F7F4EE] flex items-center justify-center transition-colors duration-150 shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A8A]"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5" aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                onClick={handleRestart}
                disabled={!audioUrl}
                aria-label="Restart audio"
                className="w-9 h-9 rounded-md border border-[#D4CCBC] bg-[#F7F4EE] hover:bg-[#E7E1D5] disabled:opacity-45 text-[#1C1917] flex items-center justify-center transition-colors duration-150 shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              </button>

              <div className="min-w-0">
                <div className="text-sm font-medium text-[#1C1917] truncate max-w-[260px] sm:max-w-[340px]">
                  {audioLabel}
                </div>
                <div className="text-xs text-[#57534E] truncate max-w-[320px]">
                  Studio WAV ({voiceName}) · Mysterious, Serious, Atmospheric
                </div>
              </div>
            </>
          )}
        </div>

        {speechEngine === 'studio' ? (
          <div className="flex-1 min-w-[220px] max-w-md flex items-center gap-3">
            <canvas
              ref={canvasRef}
              width={160}
              height={28}
              className="hidden sm:block shrink-0"
              aria-hidden="true"
            />
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.05}
              value={currentTime}
              disabled={!audioUrl}
              onChange={(e) => handleSeek(Number.parseFloat(e.target.value))}
              aria-label="Audio playback progress"
              className="w-full accent-[#1E3A8A] cursor-pointer disabled:cursor-not-allowed"
            />
            <span className="font-mono text-xs tabular-nums text-[#57534E] whitespace-nowrap shrink-0">
              {formatSecondsClock(currentTime)} / {formatSecondsClock(duration)}
            </span>
          </div>
        ) : (
          <div className="text-xs font-mono text-[#57534E] truncate max-w-xs">
            {activeBrowserVoice ? activeBrowserVoice.name : 'System Default English Voice'}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div
            className="inline-flex items-center p-0.5 bg-[#E3DDD0] rounded-md border border-[#D4CCBC]"
            role="group"
            aria-label="Narration engine"
          >
            <button
              type="button"
              onClick={() => onChangeSpeechEngine('browser')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                speechEngine === 'browser'
                  ? 'bg-white text-[#1C1917] shadow-xs'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              Browser Voice (No AI)
            </button>
            <button
              type="button"
              onClick={() => onChangeSpeechEngine('studio')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                speechEngine === 'studio'
                  ? 'bg-white text-[#1C1917] shadow-xs'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              Studio WAV
            </button>
          </div>

          {speechEngine === 'studio' && (
            <button
              type="button"
              onClick={cycleRate}
              aria-label="Change playback speed"
              className="px-2.5 py-1.5 text-xs font-mono tabular-nums border border-[#D4CCBC] bg-[#F7F4EE] hover:bg-[#E7E1D5] text-[#1C1917] rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              {playbackRate.toFixed(1)}x
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowVoiceSettings((v) => !v)}
            aria-expanded={showVoiceSettings}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-md transition-colors whitespace-nowrap shrink-0 ${
              showVoiceSettings
                ? 'border-[#1E3A8A] bg-[#1E3A8A] text-[#F7F4EE]'
                : 'border-[#D4CCBC] bg-[#F7F4EE] hover:bg-[#E7E1D5] text-[#1C1917]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Voice Settings</span>
          </button>

          {speechEngine === 'studio' && audioUrl && (
            <a
              href={audioUrl}
              download={downloadFilename}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#D4CCBC] bg-[#F7F4EE] hover:bg-[#E7E1D5] text-[#1C1917] rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>WAV (24kHz)</span>
            </a>
          )}

          {speechEngine === 'studio' && audioBlob && (
            <button
              type="button"
              onClick={() => {
                void (async () => {
                  const wav48 = await exportBroadcast48kWav(audioBlob);
                  const url48 = URL.createObjectURL(wav48);
                  const a = document.createElement('a');
                  a.href = url48;
                  a.download = downloadFilename.replace(
                    /\.wav$/i,
                    '-48khz-youtube.wav',
                  );
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url48), 2000);
                })();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-[#1E3A8A] bg-[#1E3A8A] hover:bg-[#172E6E] text-[#F7F4EE] rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>YouTube 48kHz WAV</span>
            </button>
          )}
        </div>
      </div>

      {showVoiceSettings && speechEngine === 'browser' && (
        <div className="px-5 py-4 border-t border-[#DDD6C8] bg-[#F7F4EE] grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-6 space-y-2">
            <label
              htmlFor="browser-voice-select"
              className="block text-xs font-medium text-[#57534E]"
            >
              System Voice (Runs Locally in Browser — Zero AI)
            </label>
            <select
              id="browser-voice-select"
              value={selectedBrowserVoiceURI}
              onChange={(e) => onChangeBrowserVoiceURI(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#D4CCBC] rounded-md text-[#1C1917] focus:outline-2 focus:outline-[#1E3A8A]"
            >
              {browserVoices.length === 0 ? (
                <option value="">System Default Voice</option>
              ) : (
                browserVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="lg:col-span-3 space-y-2">
            <label
              htmlFor="browser-pitch-range"
              className="block text-xs font-medium text-[#57534E] font-mono tabular-nums"
            >
              Deep Pitch: {browserPitch.toFixed(2)}
            </label>
            <input
              id="browser-pitch-range"
              type="range"
              min={0.55}
              max={1.15}
              step={0.02}
              value={browserPitch}
              onChange={(e) => onChangeBrowserPitch(Number.parseFloat(e.target.value))}
              className="w-full accent-[#1E3A8A]"
            />
          </div>

          <div className="lg:col-span-3 space-y-2">
            <label
              htmlFor="browser-rate-range"
              className="block text-xs font-medium text-[#57534E] font-mono tabular-nums"
            >
              Slow Pacing: {browserRate.toFixed(2)}x
            </label>
            <input
              id="browser-rate-range"
              type="range"
              min={0.65}
              max={1.15}
              step={0.02}
              value={browserRate}
              onChange={(e) => onChangeBrowserRate(Number.parseFloat(e.target.value))}
              className="w-full accent-[#1E3A8A]"
            />
          </div>
        </div>
      )}

      {showVoiceSettings && speechEngine === 'studio' && (
        <div className="px-5 py-4 border-t border-[#DDD6C8] bg-[#F7F4EE] grid grid-cols-1 lg:grid-cols-12 gap-5">
          {!studioTtsAvailable && (
            <div className="lg:col-span-12 p-3 bg-[#EFEBE3] border border-[#D4CCBC] rounded text-xs text-[#292524]">
              Optional Studio WAV export is unavailable because no server TTS key is configured. Switch back to <strong>Browser Voice (No AI)</strong> to read stories aloud offline.
            </div>
          )}
          <div className="lg:col-span-5 space-y-2">
            <label
              htmlFor="voice-preset-select"
              className="block text-xs font-medium text-[#57534E]"
            >
              Studio WAV Voice Profile
            </label>
            <select
              id="voice-preset-select"
              value={voiceName}
              onChange={(e) => {
                const selected = e.target.value as PrebuiltVoiceName;
                const preset = VOICE_PRESETS.find(
                  (p) => p.voiceName === selected,
                );
                onChangeVoice(selected, preset?.style);
              }}
              className="w-full px-3 py-2 text-sm bg-white border border-[#D4CCBC] rounded-md text-[#1C1917] focus:outline-2 focus:outline-[#1E3A8A]"
            >
              {VOICE_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.voiceName}>
                  {preset.label} ({preset.voiceName})
                </option>
              ))}
            </select>
            <p className="text-xs text-[#57534E]">
              {VOICE_PRESETS.find((p) => p.voiceName === voiceName)?.summary}
            </p>
          </div>

          <div className="lg:col-span-7 space-y-2">
            <label
              htmlFor="voice-style-prompt"
              className="block text-xs font-medium text-[#57534E]"
            >
              Delivery & Style Direction
            </label>
            <input
              id="voice-style-prompt"
              type="text"
              value={stylePrompt}
              onChange={(e) => onChangeStyle(e.target.value)}
              placeholder="Confident and clear, deep pitch. Mysterious, serious, atmospheric..."
              className="w-full px-3 py-2 text-sm bg-white border border-[#D4CCBC] rounded-md text-[#1C1917] focus:outline-2 focus:outline-[#1E3A8A]"
            />
            <p className="text-xs text-[#57534E]">
              Used when exporting downloadable 24kHz / 48kHz WAV masters. Scripted [PAUSE] markers are preserved as exact silence intervals.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
