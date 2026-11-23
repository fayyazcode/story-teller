export interface BrowserSpeechOptions {
  text: string;
  voiceURI?: string;
  pitch?: number;
  rate?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
}

type SpeechPart =
  | { type: 'text'; value: string }
  | { type: 'pause'; ms: number };

function splitWithPauses(input: string): SpeechPart[] {
  const regex = /\[PAUSE(?:\s*-\s*(\d+)\s*SECONDS?)?\]/gi;
  const parts: SpeechPart[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    const before = input.slice(lastIdx, match.index).replace(/<[^>]+>/g, '').trim();
    if (before) {
      parts.push({ type: 'text', value: before });
    }
    const sec = match[1] ? Number.parseInt(match[1], 10) : 1.5;
    parts.push({
      type: 'pause',
      ms: (Number.isFinite(sec) ? Math.min(Math.max(sec, 0.5), 10) : 1.5) * 1000,
    });
    lastIdx = match.index + match[0].length;
  }

  const tail = input.slice(lastIdx).replace(/<[^>]+>/g, '').trim();
  if (tail) {
    parts.push({ type: 'text', value: tail });
  }
  return parts;
}

export function getAvailableBrowserVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return [];
  }
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith('en'));
}

export function pickDefaultDeepBrowserVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  const preferredNames = [
    'daniel',
    'google uk english male',
    'microsoft george',
    'microsoft ryan',
    'alex',
    'arthur',
    'oliver',
    'guy',
    'male',
  ];
  for (const needle of preferredNames) {
    const found = voices.find((v) => v.name.toLowerCase().includes(needle));
    if (found) return found;
  }
  return voices[0];
}

export class BrowserNarratorController {
  private cancelled = false;
  private timerId: number | null = null;

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public stop(): void {
    this.cancelled = true;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
    }
  }

  public async speak(opts: BrowserSpeechOptions): Promise<void> {
    if (!this.isSupported()) {
      opts.onError?.('Browser speech synthesis is not supported in this browser.');
      return;
    }

    this.stop();
    this.cancelled = false;

    const parts = splitWithPauses(opts.text);
    if (parts.length === 0) {
      opts.onEnd?.();
      return;
    }

    const voices = getAvailableBrowserVoices();
    const chosenVoice =
      (opts.voiceURI ? voices.find((v) => v.voiceURI === opts.voiceURI) : null) ??
      pickDefaultDeepBrowserVoice(voices);

    opts.onStart?.();

    for (const part of parts) {
      if (this.cancelled) return;

      if (part.type === 'pause') {
        await new Promise<void>((resolve) => {
          this.timerId = window.setTimeout(() => {
            this.timerId = null;
            resolve();
          }, part.ms);
        });
        continue;
      }

      await new Promise<void>((resolve, reject) => {
        if (this.cancelled) {
          resolve();
          return;
        }
        const utterance = new SpeechSynthesisUtterance(part.value);
        if (chosenVoice) {
          utterance.voice = chosenVoice;
        }
        utterance.pitch = opts.pitch ?? 0.78;
        utterance.rate = opts.rate ?? 0.85;
        utterance.onend = () => resolve();
        utterance.onerror = (ev) => {
          if (this.cancelled || ev.error === 'interrupted' || ev.error === 'canceled') {
            resolve();
          } else {
            reject(new Error(`Browser voice error: ${ev.error}`));
          }
        };
        window.speechSynthesis.speak(utterance);
      }).catch((err) => {
        if (!this.cancelled) {
          opts.onError?.(err instanceof Error ? err.message : 'Speech failed.');
        }
        this.cancelled = true;
      });
    }

    if (!this.cancelled) {
      opts.onEnd?.();
    }
  }
}
