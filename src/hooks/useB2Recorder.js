import { useCallback, useEffect, useRef, useState } from "react";

// Recordings stay in memory while moving between tasks, never in localStorage.
export default function useB2Recorder(taskKey, limit = 60) {
  const clips = useRef(new Map());
  const active = useRef(null);
  const generation = useRef(0);
  const phase = useRef("idle");
  const [status, setStatus] = useState("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [, render] = useState(0);
  const changeStatus = useCallback((value) => {
    phase.current = value;
    setStatus(value);
  }, []);
  const getClip = useCallback((key) => clips.current.get(key), []);

  const stop = useCallback(() => {
    // A dismissed or slow browser permission prompt must never start a late recording.
    if (phase.current === "requesting") {
      generation.current += 1;
      changeStatus("idle");
    }
    const session = active.current;
    if (!session) return Promise.resolve(null);
    clearInterval(session.tick);
    clearTimeout(session.deadline);
    if (session.recorder.state !== "inactive") {
      session.stopped = performance.now();
      changeStatus("processing");
      session.recorder.stop();
    }
    return session.done;
  }, [changeStatus]);

  const start = useCallback(async () => {
    if (phase.current !== "idle") return;
    const requestSequence = ++generation.current;
    setError("");
    changeStatus("requesting");
    let stream;
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        throw new Error("unsupported");
      }
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (generation.current !== requestSequence) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"]
        .find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const session = { recorder, stream, chunks: [], started: performance.now(), limit, key: taskKey };
      session.done = new Promise((resolve) => { session.resolve = resolve; });
      active.current = session;
      recorder.ondataavailable = ({ data }) => { if (data.size) session.chunks.push(data); };
      recorder.onerror = () => {
        session.failed = true;
        setError("Recording was interrupted. Please try again.");
        stop();
      };
      recorder.onstop = () => {
        clearInterval(session.tick);
        clearTimeout(session.deadline);
        stream.getTracks().forEach((track) => track.stop());
        if (generation.current !== requestSequence) { session.resolve(null); return; }
        const blob = new Blob(session.chunks, { type: recorder.mimeType || mimeType || "audio/webm" });
        let clip = clips.current.get(taskKey);
        if (blob.size && !session.failed) {
          if (clip) URL.revokeObjectURL(clip.url);
          clip = {
            blob, url: URL.createObjectURL(blob), uploaded: false,
            duration: Math.min(limit, Math.max(1, Math.ceil(((session.stopped || performance.now()) - session.started) / 1000))),
            filename: `recording.${blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm"}`,
          };
          clips.current.set(taskKey, clip);
        } else if (!session.failed) {
          setError("No audio was captured. Please try recording again.");
        }
        active.current = null;
        changeStatus("idle");
        render((value) => value + 1);
        session.resolve(clip || null);
      };
      recorder.start();
      setElapsed(0);
      changeStatus("recording");
      session.tick = setInterval(() => {
        setElapsed(Math.min(limit, Math.floor((performance.now() - session.started) / 1000)));
      }, 200);
      session.deadline = setTimeout(stop, limit * 1000);
      stream.getAudioTracks().forEach((track) => track.addEventListener("ended", () => {
        if (active.current === session && recorder.state !== "inactive") {
          setError("Microphone disconnected. Listen to your recording before submitting.");
          stop();
        }
      }));
    } catch (err) {
      stream?.getTracks().forEach((track) => track.stop());
      if (generation.current !== requestSequence) return;
      active.current = null;
      changeStatus("idle");
      setError(err.name === "NotAllowedError" || err.name === "SecurityError"
        ? "Microphone is blocked. Allow access in your browser’s site settings, then try again."
        : err.name === "NotFoundError"
          ? "No microphone found. Connect one, then try again."
          : err.message === "unsupported"
            ? "Recording isn’t supported here. Open this screen in an up-to-date browser."
            : "Couldn’t start the microphone. Check that it isn’t in use, then try again.");
    }
  }, [taskKey, limit, changeStatus, stop]);

  const markUploaded = useCallback((key, clip) => {
    if (clips.current.get(key) === clip) clip.uploaded = true;
    render((value) => value + 1);
  }, []);

  useEffect(() => { setError(""); setElapsed(0); }, [taskKey]);
  useEffect(() => {
    const retainedClips = clips.current;
    return () => {
      generation.current += 1;
      const session = active.current;
      if (session) {
        clearInterval(session.tick);
        clearTimeout(session.deadline);
        session.recorder.onstop = null;
        session.recorder.ondataavailable = null;
        session.recorder.onerror = null;
        if (session.recorder.state !== "inactive") session.recorder.stop();
        active.current = null;
        session.stream.getTracks().forEach((track) => track.stop());
        session.resolve(null);
      }
      retainedClips.forEach((clip) => URL.revokeObjectURL(clip.url));
      retainedClips.clear();
    };
  }, []);

  return {
    status, elapsed, error, clip: getClip(taskKey), start, stop, getClip, markUploaded,
    hasUnsaved: [...clips.current.values()].some((clip) => !clip.uploaded),
  };
}
