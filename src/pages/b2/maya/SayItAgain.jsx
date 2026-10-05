import { useEffect, useRef, useState } from "react";
import { getB2MayaSayAudio, postB2MayaSayAttempt } from "../../../api/b2MayaApi";

/** Collects the microphone as 16 kHz mono PCM16 (the context is created at 16 kHz). */
const WORKLET = `
class Rec16 extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) this.port.postMessage(ch.slice(0));
    return true;
  }
}
registerProcessor("rec16", Rec16);`;

/** Stops listening after this much quiet once they've spoken, or at the latest after MAX_MS. */
const SILENCE_MS = 1400;
const MAX_MS = 15_000;
const SPEECH_LEVEL = 0.02;

function toWav(chunks, rate = 16000) {
  const n = chunks.reduce((s, c) => s + c.length, 0);
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const str = (o, s) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + n * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, n * 2, true);
  let o = 44;
  for (const c of chunks)
    for (let i = 0; i < c.length; i++, o += 2) {
      const s = Math.max(-1, Math.min(1, c[i]));
      v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
  return new Blob([buf], { type: "audio/wav" });
}

const tone = (score) => (score >= 70 ? "good" : score >= 40 ? "mid" : "bad");

/**
 * "Try it": Maya says the corrected sentence, the learner says it, and each word is scored against
 * that exact sentence. The recording starts by itself when Maya has finished and stops after a
 * short silence.
 */
export default function SayItAgain({ sessionId, index, best: bestProp }) {
  const [phase, setPhase] = useState("idle");
  const [result, setResult] = useState(null);
  const [best, setBest] = useState(bestProp);
  const [message, setMessage] = useState("");
  const [level, setLevel] = useState(0);
  const stopRef = useRef(null);

  useEffect(() => () => stopRef.current?.(), []);

  const play = async () => {
    const url = await getB2MayaSayAudio(sessionId, index);
    try {
      await new Promise((resolve, reject) => {
        const audio = new Audio(url);
        audio.onended = () => resolve();
        audio.onerror = () => reject(new Error("audio"));
        audio.play().catch(reject);
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  /** Records until a short silence; `onReady` fires once the microphone is really recording. */
  const record = async (onReady) => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    const ctx = new AudioContext({ sampleRate: 16000 });
    const workletUrl = URL.createObjectURL(new Blob([WORKLET], { type: "text/javascript" }));
    await ctx.audioWorklet.addModule(workletUrl);
    URL.revokeObjectURL(workletUrl);
    const src = ctx.createMediaStreamSource(stream);
    const node = new AudioWorkletNode(ctx, "rec16");
    src.connect(node);
    const chunks = [];
    // "Your turn" only shows now: before this, the first word would be lost.
    onReady();
    return new Promise((resolve) => {
      const started = Date.now();
      let spoke = false;
      let quietSince = 0;
      const finish = () => {
        stopRef.current = null;
        node.disconnect();
        src.disconnect();
        stream.getTracks().forEach((t) => t.stop());
        void ctx.close();
        setLevel(0);
        resolve(spoke ? toWav(chunks) : null);
      };
      stopRef.current = finish;
      node.port.onmessage = (e) => {
        const c = e.data;
        chunks.push(c);
        let sum = 0;
        for (let i = 0; i < c.length; i++) sum += c[i] * c[i];
        const rms = Math.sqrt(sum / c.length);
        setLevel(Math.min(1, rms * 8));
        const now = Date.now();
        if (rms > SPEECH_LEVEL) {
          spoke = true;
          quietSince = 0;
        } else if (spoke && !quietSince) quietSince = now;
        if ((spoke && quietSince && now - quietSince > SILENCE_MS) || now - started > MAX_MS) finish();
      };
    });
  };

  const start = async (listenFirst) => {
    setMessage("");
    try {
      if (listenFirst) {
        setPhase("playing");
        await play();
      }
      const wav = await record(() => setPhase("recording"));
      if (!wav) {
        setPhase("error");
        setMessage("We didn't hear you. Check that your microphone is on, then try again.");
        return;
      }
      setPhase("scoring");
      const result = await postB2MayaSayAttempt(sessionId, index, wav);
      setResult(result);
      setBest((b) => Math.max(b ?? 0, result.score));
      setPhase("done");
    } catch (e) {
      stopRef.current?.();
      setPhase("error");
      const serverMsg = e?.response?.data?.msg;
      setMessage(
        serverMsg
          ? serverMsg
          : e?.name === "NotAllowedError" || /permission|denied/i.test(e?.message ?? "")
            ? "Allow the microphone for this app, then try again."
            : e?.name === "NotFoundError"
              ? "No microphone was found. Connect one, then try again."
              : "That didn't work. Please try again.",
      );
    }
  };

  const shown = result?.words.filter((w) => w.error !== "Insertion") ?? [];
  const missed = shown.filter((w) => w.error === "Omission").map((w) => w.word);

  return (
    <div className="sc-try">
      {phase === "idle" ? (
        <div className="sc-row" style={{ gap: 8, alignItems: "center" }}>
          <button type="button" className="sc-btn sc-btn-secondary sc-btn-sm" onClick={() => start(true)}>
            Try it: hear it, then say it
          </button>
          {best !== undefined ? <span className={`sc-pill ${tone(best)}`}>Best {best}</span> : null}
        </div>
      ) : null}
      {phase === "playing" ? (
        <p className="sc-small sc-muted" role="status">
          Listen…
        </p>
      ) : null}
      {phase === "recording" ? (
        <div className="sc-stack" style={{ gap: 6 }} role="status">
          <p className="sc-small">
            <strong>Your turn:</strong> say the sentence.
          </p>
          <div className="sc-meter" aria-label="Microphone level">
            <i style={{ width: `${Math.round(level * 100)}%` }} />
          </div>
          <button type="button" className="sc-btn sc-btn-quiet sc-btn-sm" onClick={() => stopRef.current?.()}>
            I&apos;m done
          </button>
        </div>
      ) : null}
      {phase === "scoring" ? (
        <p className="sc-small sc-muted" role="status">
          Checking every word…
        </p>
      ) : null}
      {phase === "done" && result ? (
        <div className="sc-stack" style={{ gap: 8 }} role="status">
          <p className="sc-scored" lang="de">
            {shown.map((w, i) => (
              <span key={i} className={`sc-scored-word ${w.error === "Omission" ? "missed" : tone(w.score)}`} title={w.error === "Omission" ? "Left out" : `${w.score}/100`}>
                {w.word}
              </span>
            ))}
          </p>
          <p className="sc-small">
            <span className={`sc-pill ${missed.length ? (result.score >= 40 ? "mid" : "bad") : tone(result.score)}`}>{result.score}/100</span>{" "}
            {missed.length ? `You left out: ${missed.join(", ")}.` : result.score >= 70 ? "Very clear." : result.score >= 40 ? "Nearly there: listen again to the words in amber and red." : "Listen once more, then try again."}
          </p>
          <div className="sc-row" style={{ gap: 8 }}>
            <button type="button" className="sc-btn sc-btn-secondary sc-btn-sm" onClick={() => start(false)}>
              Try again
            </button>
            <button type="button" className="sc-btn sc-btn-quiet sc-btn-sm" onClick={() => start(true)}>
              Hear it again
            </button>
          </div>
        </div>
      ) : null}
      {phase === "error" ? (
        <div className="sc-stack" style={{ gap: 6 }}>
          <p className="sc-notice warn" role="alert">
            {message}
          </p>
          <button type="button" className="sc-btn sc-btn-secondary sc-btn-sm" onClick={() => start(true)}>
            Try again
          </button>
        </div>
      ) : null}
    </div>
  );
}
