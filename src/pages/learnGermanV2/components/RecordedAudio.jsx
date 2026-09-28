import { useEffect, useRef, useState } from "react";

// Playback row for a just-captured recording: play control, label, running
// clock, and an amber bar that fills as it plays.
export default function RecordedAudio({ src, label = "Recorded audio" }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState(0);
  const [len, setLen] = useState(0);

  useEffect(() => { setPlaying(false); setAt(0); setLen(0); }, [src]);

  const clock = (s) => {
    if (!isFinite(s) || s < 0) s = 0;
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  };
  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) { el.play(); setPlaying(true); } else { el.pause(); setPlaying(false); }
  };

  return (
    <div className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause" : "Play recording"}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#17336d] text-white"
      >
        {playing ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
            <rect x="7" y="5" width="3.5" height="14" rx="1" />
            <rect x="13.5" y="5" width="3.5" height="14" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
            <path d="M8 5.5v13l11-6.5z" />
          </svg>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-medium text-slate-700">{label}</span>
          <span className="shrink-0 text-xs tabular-nums text-slate-400">
            {clock(at)} / {clock(len)}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <i className="block h-full rounded-full bg-amber-400 transition-[width]" style={{ width: `${len ? (at / len) * 100 : 0}%` }} />
        </div>
      </div>
      <audio ref={ref} src={src} preload="metadata"
        onLoadedMetadata={(e) => setLen(e.currentTarget.duration)}
        onTimeUpdate={(e) => setAt(e.currentTarget.currentTime)}
        onEnded={() => { setPlaying(false); setAt(0); }} />
    </div>
  );
}
