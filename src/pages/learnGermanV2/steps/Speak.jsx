import { useEffect } from "react";
import { speak } from "../lib/audio";
import { ENCOURAGE, withName } from "../lib/curriculum";
import { useRecorder } from "../lib/useRecorder";
import MicButton from "../components/MicButton";
import RecordedAudio from "../components/RecordedAudio";

// Hear it, say it. Recording is real but never graded — the point is that she
// has said the sentence out loud once, not that a machine approved of it.
export default function Speak({ step = {}, ctx = {} }) {
  const de = withName(step?.de, ctx?.userFirstName);
  const en = withName(step?.en, ctx?.userFirstName);
  const rec = useRecorder();

  useEffect(() => {
    if (de) speak(de);
    ctx?.setMainBtn?.({ label: "I said it", disabled: false });
    ctx?.setFootSkip?.({ label: "Can't speak right now", onSkip: () => { ctx?.onCooldown?.("speak"); ctx?.advance?.(); } });
    ctx?.registerSpeakCheck?.(() => ({ ok: true, msg: ENCOURAGE[Math.floor(Math.random() * ENCOURAGE.length)] }));
    // eslint-disable-next-line
  }, [step]);

  const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center">
      {/* One box — the phrase, its gloss and the mic are the same object. */}
      <div className="w-full rounded-3xl bg-white p-5 ring-1 ring-slate-200">
        <div className="text-center text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Say it</div>
        <button
          className="mx-auto mt-3 flex w-full items-center gap-3 rounded-2xl bg-indigo-50 px-4 py-3 ring-1 ring-indigo-200"
          onClick={() => speak(de)}
          aria-label={`Hear ${de}`}
        >
          <span aria-hidden="true" className="text-indigo-600">
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" /></svg>
          </span>
          <span className="text-left text-lg font-bold text-slate-800">{de}</span>
        </button>
        <div className="mt-2 text-center text-sm text-slate-500">{en}</div>

        <div className="mt-5">
          <MicButton
            state={rec.recording ? "recording" : rec.url ? "done" : "idle"}
            onTap={rec.toggle}
            time={rec.recording || rec.url ? `${clock(rec.secs)} / 01:00` : null}
          />
        </div>
        {rec.url && (
          <div className="mt-3">
            <RecordedAudio src={rec.url} />
          </div>
        )}
        {rec.url && (
          <button type="button" className="mx-auto mt-2 block text-sm font-semibold text-indigo-600" onClick={rec.start}>
            Re-record
          </button>
        )}
        {rec.noMic && <div className="mt-2 text-center text-xs text-slate-500">No microphone here. Say it out loud anyway.</div>}
      </div>
    </div>
  );
}
