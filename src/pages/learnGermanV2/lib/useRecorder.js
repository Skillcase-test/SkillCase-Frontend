import { useEffect, useRef, useState } from "react";

// The MediaRecorder plumbing, in one place — ported from the reference app.
// Speak and SpeakCards both consume it; it releases the mic when the step
// unmounts so a step change never leaves the microphone open behind it.
export function useRecorder() {
  const [recording, setRecording] = useState(false);
  const [url, setUrl] = useState(null);
  const [secs, setSecs] = useState(0);
  const [noMic, setNoMic] = useState(false);
  const recRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const tickRef = useRef(null);
  const urlRef = useRef(null);

  const setAudioUrl = (u) => {
    if (urlRef.current && urlRef.current !== u) URL.revokeObjectURL(urlRef.current);
    urlRef.current = u;
    setUrl(u);
  };

  const release = () => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    if (recRef.current && recRef.current.state === "recording") {
      try { recRef.current.stop(); } catch { /* already stopped */ }
    }
    if (streamRef.current?.getTracks) streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = null; }
  };
  useEffect(() => () => release(), []);

  const start = async () => {
    setAudioUrl(null);
    setSecs(0);
    if (!navigator?.mediaDevices?.getUserMedia || typeof window.MediaRecorder === "undefined") {
      setNoMic(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = () => {
        try { setAudioUrl(URL.createObjectURL(new Blob(chunksRef.current))); } catch { /* nothing captured */ }
        if (stream?.getTracks) stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
      tickRef.current = setInterval(() => setSecs((s) => s + 1), 1000);
    } catch {
      setNoMic(true);
    }
  };

  const stop = () => {
    setRecording(false);
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    if (recRef.current && recRef.current.state === "recording") {
      try { recRef.current.stop(); } catch { /* already stopped */ }
    }
  };

  const reset = () => { stop(); setAudioUrl(null); setSecs(0); };

  return { recording, url, secs, noMic, start, stop, reset, toggle: () => (recording ? stop() : start()) };
}
