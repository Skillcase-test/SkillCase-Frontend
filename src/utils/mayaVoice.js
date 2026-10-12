/*
 * Plays the coach's voice in the browser: Azure sends it as base64 PCM16 at 24 kHz in chunks,
 * faster than it is spoken, and they're queued back to back. The loudness of what's playing
 * drives Maya's speaking ring and the caption timing.
 */

export const VOICE_SAMPLE_RATE = 24000;
/** A little audio is buffered before the first chunk plays, so the voice doesn't stutter. */
const START_DELAY_S = 0.12;

/** Azure's base64 PCM16 as samples in [-1, 1]. */
export function pcm16ToFloat32(b64) {
  const bin = atob(b64);
  const n = bin.length >> 1;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let v = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8);
    if (v >= 0x8000) v -= 0x10000;
    out[i] = v / 0x8000;
  }
  return out;
}

export class VoicePlayer {
  ctx = null;
  analyser = null;
  buf = null;
  sources = new Set();
  nextTime = 0;
  speaking = false;

  /** onStart: the first chunk of a reply is audible now. onEnd: everything queued has been played. */
  constructor(events) {
    this.events = events;
    this.ctx = new AudioContext();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.connect(this.ctx.destination);
    this.buf = new Float32Array(this.analyser.fftSize);
  }

  /** Call from the tap that starts the call: browsers only let audio start after one. */
  resume() {
    return this.ctx.resume().catch(() => {});
  }

  push(b64) {
    const samples = pcm16ToFloat32(b64);
    if (!samples.length) return;
    const buffer = this.ctx.createBuffer(1, samples.length, VOICE_SAMPLE_RATE);
    buffer.getChannelData(0).set(samples);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.analyser);
    const startAt = Math.max(this.nextTime, this.ctx.currentTime + START_DELAY_S);
    src.start(startAt);
    this.nextTime = startAt + buffer.duration;
    this.sources.add(src);
    src.onended = () => {
      this.sources.delete(src);
      if (!this.sources.size && this.speaking) {
        this.speaking = false;
        this.events.onEnd();
      }
    };
    if (!this.speaking) {
      this.speaking = true;
      setTimeout(() => this.events.onStart(), Math.max(0, (startAt - this.ctx.currentTime) * 1000));
    }
  }

  /** The learner talked over her: stop at once. */
  interrupt() {
    for (const s of this.sources) {
      s.onended = null;
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    }
    this.sources.clear();
    this.nextTime = 0;
    if (this.speaking) {
      this.speaking = false;
      this.events.onEnd();
    }
  }

  /** Loudness (RMS) of what's playing now. */
  level() {
    this.analyser.getFloatTimeDomainData(this.buf);
    let sum = 0;
    for (const v of this.buf) sum += v * v;
    return Math.sqrt(sum / this.buf.length);
  }

  close() {
    this.interrupt();
    this.ctx.close().catch(() => {});
  }
}
