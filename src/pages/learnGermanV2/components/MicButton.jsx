// The Skillcase speaking control: a navy disc inside two soft halo rings,
// instruction under it, clock under that. Tap-to-start / tap-to-stop (not
// hold-to-record — on a touch screen a held control dies the moment a finger
// drifts). `size="sm"` is the same control at reply-bar scale for the chat.
export default function MicButton({ state = "idle", onTap, label, time, size = "lg" }) {
  const text = label || (state === "recording" ? "Tap to stop" : "Tap to start recording");
  const small = size === "sm";
  const disc = small ? "h-14 w-14" : "h-20 w-20";
  return (
    <div className={`flex flex-col items-center ${small ? "gap-1" : "gap-2"}`}>
      <button
        type="button"
        onClick={onTap}
        aria-label={text}
        aria-pressed={state === "recording"}
        className={`relative ${disc} rounded-full focus:outline-none`}
      >
        <span
          aria-hidden="true"
          className={`absolute inset-0 rounded-full bg-sky-200/60 ${
            state === "recording" ? "animate-ping" : ""
          }`}
        />
        <span
          aria-hidden="true"
          className={`absolute -inset-2 rounded-full bg-sky-100/70 ${
            state === "recording" ? "animate-pulse" : ""
          }`}
        />
        <span
          aria-hidden="true"
          className={`relative flex ${disc} items-center justify-center rounded-full text-white shadow-lg ${
            state === "recording" ? "bg-rose-500" : "bg-[#17336d]"
          }`}
        >
          <svg viewBox="0 0 24 24" className={small ? "h-6 w-6" : "h-8 w-8"} fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" />
          </svg>
        </span>
      </button>
      <div className="text-xs font-semibold text-slate-500">
        {small ? (state === "recording" ? "Listening" : "Say it") : text}
      </div>
      {!small && time ? <div className="text-xs tabular-nums text-slate-400">{time}</div> : null}
    </div>
  );
}
