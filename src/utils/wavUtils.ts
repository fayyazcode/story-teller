import type { Shot } from '../types/storyboard';

export function base64ToWavBlob(base64: string, mimeType = 'audio/wav'): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

interface WavPcmSlice {
  sampleRate: number;
  numChannels: number;
  bitsPerSample: number;
  pcmBytes: Uint8Array;
}

function parseWavBuffer(buffer: ArrayBuffer): WavPcmSlice {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  if (
    bytes.length < 44 ||
    String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== 'RIFF' ||
    String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) !== 'WAVE'
  ) {
    return {
      sampleRate: 24000,
      numChannels: 1,
      bitsPerSample: 16,
      pcmBytes: bytes,
    };
  }

  let sampleRate = 24000;
  let numChannels = 1;
  let bitsPerSample = 16;
  let dataOffset = 44;
  let dataSize = bytes.length - 44;

  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const chunkId = String.fromCharCode(
      bytes[offset],
      bytes[offset + 1],
      bytes[offset + 2],
      bytes[offset + 3],
    );
    const chunkSize = view.getUint32(offset + 4, true);
    if (chunkId === 'fmt ' && offset + 24 <= bytes.length) {
      numChannels = view.getUint16(offset + 10, true);
      sampleRate = view.getUint32(offset + 12, true);
      bitsPerSample = view.getUint16(offset + 22, true);
    } else if (chunkId === 'data') {
      dataOffset = offset + 8;
      dataSize = Math.min(chunkSize, bytes.length - dataOffset);
      break;
    }
    offset += 8 + chunkSize + (chunkSize % 2);
  }

  return {
    sampleRate,
    numChannels,
    bitsPerSample,
    pcmBytes: bytes.slice(dataOffset, dataOffset + dataSize),
  };
}

function createWavHeader(
  totalPcmBytes: number,
  sampleRate: number,
  numChannels: number,
  bitsPerSample: number,
): ArrayBuffer {
  const bytesPerSample = bitsPerSample / 8;
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const out = new Uint8Array(header);

  const writeStr = (pos: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      out[pos + i] = str.charCodeAt(i);
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + totalPcmBytes, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, 'data');
  view.setUint32(40, totalPcmBytes, true);

  return header;
}

export async function getWavDurationSeconds(blob: Blob): Promise<number> {
  const buffer = await blob.arrayBuffer();
  const parsed = parseWavBuffer(buffer);
  const bytesPerSecond =
    parsed.sampleRate * parsed.numChannels * (parsed.bitsPerSample / 8);
  if (bytesPerSecond <= 0) return 0;
  return parsed.pcmBytes.length / bytesPerSecond;
}

export async function concatenateWavBlobs(
  blobs: Blob[],
  gapSeconds = 1.0,
): Promise<Blob> {
  if (blobs.length === 0) {
    throw new Error('No audio clips provided to concatenate.');
  }
  if (blobs.length === 1) {
    return blobs[0];
  }

  const slices: WavPcmSlice[] = [];
  for (const blob of blobs) {
    const buf = await blob.arrayBuffer();
    slices.push(parseWavBuffer(buf));
  }

  const { sampleRate, numChannels, bitsPerSample } = slices[0];
  const bytesPerSample = bitsPerSample / 8;
  const gapByteCount =
    Math.round(gapSeconds * sampleRate) * numChannels * bytesPerSample;

  let totalPcmBytes = 0;
  for (let i = 0; i < slices.length; i++) {
    totalPcmBytes += slices[i].pcmBytes.length;
    if (i < slices.length - 1 && gapByteCount > 0) {
      totalPcmBytes += gapByteCount;
    }
  }

  const header = createWavHeader(
    totalPcmBytes,
    sampleRate,
    numChannels,
    bitsPerSample,
  );
  const output = new Uint8Array(44 + totalPcmBytes);
  output.set(new Uint8Array(header), 0);

  let writePos = 44;
  for (let i = 0; i < slices.length; i++) {
    output.set(slices[i].pcmBytes, writePos);
    writePos += slices[i].pcmBytes.length;
    if (i < slices.length - 1 && gapByteCount > 0) {
      writePos += gapByteCount;
    }
  }

  return new Blob([output], { type: 'audio/wav' });
}

/**
 * Resamples 24kHz 16-bit mono WAV into broadcast-standard 48kHz 16-bit mono WAV
 * for drop-in alignment on 48kHz / 24fps YouTube NLE timelines (Premiere, DaVinci Resolve, FCP).
 */
export async function exportBroadcast48kWav(blob: Blob): Promise<Blob> {
  const buf = await blob.arrayBuffer();
  const parsed = parseWavBuffer(buf);
  if (parsed.sampleRate === 48000 || parsed.bitsPerSample !== 16 || parsed.numChannels !== 1) {
    return blob;
  }

  const inSamples = new Int16Array(
    parsed.pcmBytes.buffer,
    parsed.pcmBytes.byteOffset,
    Math.floor(parsed.pcmBytes.byteLength / 2),
  );
  const ratio = 48000 / parsed.sampleRate;
  const outLength = Math.floor(inSamples.length * ratio);
  const outPcm = new Uint8Array(outLength * 2);
  const outView = new DataView(outPcm.buffer);

  for (let i = 0; i < outLength; i++) {
    const srcPos = i / ratio;
    const idx0 = Math.floor(srcPos);
    const idx1 = Math.min(idx0 + 1, inSamples.length - 1);
    const frac = srcPos - idx0;
    const interpolated = Math.round(
      inSamples[idx0] * (1 - frac) + inSamples[idx1] * frac,
    );
    outView.setInt16(i * 2, Math.max(-32768, Math.min(32767, interpolated)), true);
  }

  const header = createWavHeader(outPcm.length, 48000, 1, 16);
  const combined = new Uint8Array(44 + outPcm.length);
  combined.set(new Uint8Array(header), 0);
  combined.set(outPcm, 44);
  return new Blob([combined], { type: 'audio/wav' });
}

function formatSrtTime(totalSeconds: number): string {
  const ms = Math.round((totalSeconds % 1) * 1000);
  const whole = Math.floor(totalSeconds);
  const hrs = Math.floor(whole / 3600);
  const mins = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

export function generateSrtCaptions(
  shots: Shot[],
  durationsByShotId?: Record<string, number>,
  gapSeconds = 1.0,
): string {
  let cursor = 0;
  return shots
    .map((shot, idx) => {
      const dur = durationsByShotId?.[shot.id] ?? shot.durationSeconds;
      const start = cursor;
      const end = start + dur;
      cursor = end + (durationsByShotId ? gapSeconds : 0);
      const cleanText = shot.narration
        .replace(/\[PAUSE(?:\s*-\s*\d+\s*SECONDS?)?\]/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
      return `${idx + 1}\n${formatSrtTime(start)} --> ${formatSrtTime(end)}\n${cleanText}\n`;
    })
    .join('\n');
}

export function formatSecondsClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
