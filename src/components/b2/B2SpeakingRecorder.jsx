import { useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2, RotateCcw, Check, Clock3, AlertCircle, Play, Pause } from "lucide-react";

function time(seconds) {
  const value = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(value / 60).toString().padStart(2, "0")}:${(value % 60).toString().padStart(2, "0")}`;
}

export default function B2SpeakingRecorder({ recorder, limit, disabled, onStart, onPlayback }) {
  const { status, clip, elapsed, error, stop } = recorder;
  const [replace, setReplace] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackError, setPlaybackError] = useState("");
  const audio = useRef(null);
  const isRecording = status === "recording";
  const waiting = status === "requesting" || status === "processing";
  const ready = clip && status === "idle";
  useEffect(() => { setReplace(false); setPlaying(false); setPlaybackTime(0); setPlaybackError(""); }, [clip]);
  useEffect(() => { if (disabled || status !== "idle") audio.current?.pause(); }, [disabled, status]);

  return (
    <section className={`b2-speaking-recorder ${ready ? "is-ready" : ""}`} aria-label="Your recording">
      {ready ? <>
        <div className="b2-recording-ready">
          <span className="b2-row"><Check size={17} aria-hidden="true" /><strong>{clip.uploaded ? "Answer saved" : "Recording ready"}</strong></span>
          <span className="b2-muted">{time(clip.duration)}</span>
        </div>
        <audio ref={audio} key={clip.url} src={clip.url} preload="metadata"
          onPlay={() => { setPlaying(true); onPlayback(); }} onPause={() => setPlaying(false)}
          onTimeUpdate={() => setPlaybackTime(audio.current?.currentTime || 0)}
          onEnded={() => { setPlaying(false); setPlaybackTime(0); }} />
        <div className="b2-recording-player">
          <button type="button" className="b2-recording-play" aria-label={playing ? "Pause recording" : "Play recording"}
            disabled={disabled} onClick={async () => {
              setPlaybackError("");
              if (playing) audio.current?.pause();
              else try { await audio.current?.play(); }
              catch { setPlaybackError("Couldn’t play your recording. Tap play to try again."); }
            }}>{playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}</button>
          <progress aria-label="Playback progress" value={playbackTime} max={clip.duration} />
          <span>{time(playbackTime)}</span>
        </div>
        {playbackError && <p className="b2-record-error" role="alert">{playbackError}</p>}
        {replace ? <div className="b2-recording-replace">
          <p>Record a new answer? It will replace this one.</p>
          <div className="b2-row">
            <button type="button" className="b2-button b2-button--secondary" onClick={() => setReplace(false)}>Keep this</button>
            <button type="button" className="b2-button b2-button--secondary" disabled={disabled} onClick={() => { setReplace(false); onStart(); }}>Record again</button>
          </div>
        </div> : <div className="b2-recording-review">
          <span className="b2-muted">Listen before you submit.</span>
          <button type="button" disabled={disabled} onClick={() => { audio.current?.pause(); setReplace(true); }}><RotateCcw size={15} /> Re-record</button>
        </div>}
      </> : <>
        <div className="b2-record-trigger-wrap" data-radiating={!waiting && !isRecording && !disabled}>
          <span className="b2-record-ripple" aria-hidden="true" />
          <span className="b2-record-ripple" aria-hidden="true" />
          <button type="button" className="b2-record-trigger" data-recording={isRecording}
            disabled={disabled || waiting} onClick={isRecording ? stop : onStart}
            aria-label={isRecording ? "Stop recording" : waiting ? "Preparing recording" : "Tap to record"}
            aria-describedby="b2-record-hint">
            {waiting ? <Loader2 size={29} className="b2-record-spinner" /> : isRecording ? <Square size={25} fill="currentColor" /> : <Mic size={31} strokeWidth={1.8} />}
          </button>
        </div>
        <strong className="b2-record-label" role="status">
          {isRecording ? <><span className="b2-recording-dot" /> Recording · Tap to stop</> : status === "requesting" ? "Allow microphone access" : status === "processing" ? "Preparing your recording…" : "Tap to record"}
        </strong>
        <p id="b2-record-hint" className="b2-record-hint">
          {isRecording ? <><span className="b2-record-clock">{time(elapsed)} / {time(limit)}</span><span>Stops automatically at the limit</span></>
            : status === "requesting" ? <span>Use your browser’s permission prompt.</span>
              : <><Clock3 size={14} /> Up to {time(limit)} · Listen back before submitting</>}
        </p>
        {status === "requesting" && <button type="button" className="b2-record-cancel" onClick={stop}>Cancel</button>}
        {isRecording && <progress aria-label="Recording time" max={limit} value={elapsed} />}
      </>}
      {error && <p className="b2-record-error" role="alert"><AlertCircle size={18} /><span>{error}</span></p>}
    </section>
  );
}
