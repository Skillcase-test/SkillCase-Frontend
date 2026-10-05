/*
 * The coach's caption, shown in step with her voice. The text of a reply arrives well before it is
 * spoken (a whole sentence in about half a second), so showing it as it arrives runs ahead of the voice
 * and keeps rewriting itself. Azure sends when each word starts in the reply's audio; the caption shows
 * a word once the voice heard in the browser has reached it. The reply's audio is heard from the moment
 * the coach's audio gets loud after the reply began (measured in the browser), or, if that can't be
 * measured, shortly after the first word's timing arrived.
 * Without word timings it falls back to the text, shown once it has had a moment to settle.
 */

/** Punctuation joined to the previous word, and opening marks joined to the next one. */
const CLOSING = /^[.,!?;:…»“”"')\]]+$/;
const OPENING = /^[„«"([]+$/;

export function joinWords(words) {
  let out = "";
  let glue = false;
  for (const w of words) {
    if (!w) continue;
    out += !out || glue || CLOSING.test(w) ? w : ` ${w}`;
    glue = OPENING.test(w);
  }
  return out;
}

/**
 * The first `spoken` words of the reply's text, with its own punctuation and quotation marks: Azure's
 * word timings leave some out (an opening „ never comes). Without the text yet, the timed words joined.
 */
export function revealed(text, timedWords, spoken) {
  const isWord = (w) => /[\p{L}\p{N}]/u.test(w);
  const words = text.trim().split(/\s+/).filter(Boolean);
  const spokenWords = timedWords.slice(0, spoken).filter(isWord).length;
  if (words.filter(isWord).length < spokenWords) return joinWords(timedWords.slice(0, spoken));
  // Punctuation standing on its own in the text (a dash) goes with the word before it.
  let n = 0;
  let i = 0;
  for (; i < words.length && n < spokenWords; i++) if (isWord(words[i])) n++;
  while (i < words.length && !isWord(words[i])) i++;
  return words.slice(0, i).join(" ");
}

/** Loudness (RMS, 0-1) above which the coach's audio counts as her speaking. */
export const VOICE_LEVEL = 0.004;
/** Without a measured start, the voice is assumed to start this long after the first word's timing arrived. */
const ASSUMED_DELAY_MS = 700;
/** How long to wait for the voice before assuming that delay. */
const WAIT_FOR_VOICE_MS = 1200;
/** Without word timings, the text is shown after this long, so it doesn't flicker as it streams in. */
const TEXT_SETTLE_MS = 1200;

export class SpokenCaption {
  words = [];
  text = "";
  startedAt = 0;
  voiceAt = null;
  firstWordAt = null;
  firstTextAt = null;
  done = false;
  stoppedAt = null;

  /** A new reply began. */
  reset(now) {
    this.words = [];
    this.text = "";
    this.startedAt = now;
    this.voiceAt = null;
    this.firstWordAt = null;
    this.firstTextAt = null;
    this.done = false;
    this.stoppedAt = null;
  }

  word(text, offsetMs, now, durationMs = 0) {
    this.firstWordAt ??= now;
    this.words.push({ text, offset: offsetMs, end: offsetMs + durationMs });
  }

  textDelta(delta, now) {
    this.firstTextAt ??= now;
    this.text += delta;
  }

  /** The reply has been spoken to the end, or was cut off: everything said so far can show. */
  finish() {
    this.done = true;
  }

  /** The learner talked over the reply, which cuts its audio off: the caption stays where the voice stopped. */
  stop(now) {
    this.stoppedAt ??= now;
  }

  /** The loudness of the coach's audio right now. */
  audio(level, now) {
    // Only audio after the reply began: the tail of an earlier reply isn't this one.
    if (this.voiceAt === null && level >= VOICE_LEVEL && now - this.startedAt > 150 && (this.firstWordAt !== null || this.firstTextAt !== null)) this.voiceAt = now;
  }

  /** Where the reply's audio is heard from, if known yet. */
  heardFrom(now) {
    if (this.firstWordAt === null) return null;
    return this.voiceAt ?? (now - this.firstWordAt > WAIT_FOR_VOICE_MS ? this.firstWordAt + ASSUMED_DELAY_MS : null);
  }

  /**
   * Whether she has finished saying the reply. Azure marks a reply done once its text is written, well
   * before it has been spoken, so "done" alone would show "Your turn" while she's still talking.
   */
  finishedSpeaking(now) {
    if (this.stoppedAt !== null) return true;
    if (!this.done) return false;
    if (!this.words.length) return true;
    const from = this.heardFrom(now);
    return from !== null && now - from >= Math.max(...this.words.map((w) => w.end)) + 300;
  }

  /** The caption to show now. */
  current(at) {
    const now = this.stoppedAt !== null ? Math.min(at, this.stoppedAt) : at;
    if (this.words.length) {
      const heardFrom = this.heardFrom(now);
      if (heardFrom === null) return "";
      const elapsed = now - heardFrom;
      // Once she has said it all, the whole text shows: counting words can come up one short where the
      // text and the timings split words differently (a quoted „…?“), and the last word must not be lost.
      if (this.done && this.stoppedAt === null && elapsed >= Math.max(...this.words.map((w) => w.end))) return this.text.trim();
      return revealed(this.text, this.words.map((w) => w.text), this.words.filter((w) => w.offset <= elapsed).length);
    }
    if (this.firstTextAt !== null && (this.done || now - this.firstTextAt > TEXT_SETTLE_MS)) return this.text;
    return "";
  }
}
