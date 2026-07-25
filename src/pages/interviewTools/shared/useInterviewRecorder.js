import { useCallback, useRef, useState } from "react";

const RECORDER_MIME_CANDIDATES = [
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

// Sampled on a timer rather than requestAnimationFrame: rAF stops entirely
// while the tab is hidden or the phone screen is off, which would make a real
// answer look silent.
const AUDIO_SAMPLE_INTERVAL_MS = 100;
const SILENCE_THRESHOLD = 0.02;

function canPlaybackMimeType(mimeType) {
  if (typeof document === "undefined" || !mimeType) {
    return true;
  }

  const video = document.createElement("video");
  const normalized = String(mimeType).split(";")[0];

  return (
    video.canPlayType(mimeType) !== "" || video.canPlayType(normalized) !== ""
  );
}

function getSupportedRecorderMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  for (const mimeType of RECORDER_MIME_CANDIDATES) {
    if (
      MediaRecorder.isTypeSupported?.(mimeType) &&
      canPlaybackMimeType(mimeType)
    ) {
      return mimeType;
    }
  }

  return "";
}

// Deliberately does not consider track.muted. That flag is browser-controlled
// and flips on transiently — right after getUserMedia on iOS, and during any
// interruption such as an incoming call — so gating on it rejects a working
// microphone. Whether audio actually arrived is the audio monitor's job.
function hasUsableAudioTrack(mediaStream) {
  if (!mediaStream) return false;
  const audioTracks = mediaStream.getAudioTracks?.() || [];
  if (!audioTracks.length) return false;

  return audioTracks.some(
    (track) => track.readyState === "live" && track.enabled !== false,
  );
}

export default function useInterviewRecorder() {
  const [stream, setStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingHasAudioSignal, setRecordingHasAudioSignal] = useState(false);
  // Render-visible twin of audioMonitorReliableRef, so the UI can tell
  // "we heard nothing" apart from "we could not listen".
  const [audioMonitorReliable, setAudioMonitorReliable] = useState(false);
  const [error, setError] = useState("");

  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const mimeTypeRef = useRef("");
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const monitorIntervalRef = useRef(null);
  const audioSignalDetectedRef = useRef(false);
  // False whenever the monitor could not actually listen (no AudioContext, or
  // one that refused to leave the suspended state). Callers must not read
  // "no signal" as "silent" when this is false.
  const audioMonitorReliableRef = useRef(false);

  const stopAudioMonitor = useCallback(() => {
    if (monitorIntervalRef.current) {
      clearInterval(monitorIntervalRef.current);
      monitorIntervalRef.current = null;
    }

    try {
      sourceNodeRef.current?.disconnect();
    } catch {
      // noop
    }

    try {
      analyserRef.current?.disconnect?.();
    } catch {
      // noop
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }

    sourceNodeRef.current = null;
    analyserRef.current = null;
    audioContextRef.current = null;
  }, []);

  const startAudioMonitor = useCallback(
    async (mediaStream) => {
      stopAudioMonitor();
      audioSignalDetectedRef.current = false;
      audioMonitorReliableRef.current = false;
      setRecordingHasAudioSignal(false);
      setAudioMonitorReliable(false);

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx || !mediaStream) {
        return;
      }

      let audioContext = null;

      try {
        audioContext = new AudioCtx();

        // A context created outside a user gesture starts suspended, and a
        // suspended analyser reports nothing but silence. That is what made
        // the microphone look dead for candidates who let the prepare
        // countdown run out instead of tapping through it.
        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }

        if (audioContext.state !== "running") {
          await audioContext.close().catch(() => {});
          return;
        }

        const source = audioContext.createMediaStreamSource(mediaStream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.8;

        source.connect(analyser);

        audioContextRef.current = audioContext;
        sourceNodeRef.current = source;
        analyserRef.current = analyser;

        const data = new Uint8Array(analyser.fftSize);

        monitorIntervalRef.current = setInterval(() => {
          if (!analyserRef.current) return;

          analyserRef.current.getByteTimeDomainData(data);
          let peak = 0;
          for (let i = 0; i < data.length; i += 1) {
            const normalized = Math.abs((data[i] - 128) / 128);
            if (normalized > peak) peak = normalized;
          }

          if (peak > SILENCE_THRESHOLD && !audioSignalDetectedRef.current) {
            audioSignalDetectedRef.current = true;
            setRecordingHasAudioSignal(true);
          }
        }, AUDIO_SAMPLE_INTERVAL_MS);

        audioMonitorReliableRef.current = true;
        setAudioMonitorReliable(true);
      } catch (err) {
        // Monitoring is best-effort. Recording must never be blocked because
        // we failed to set up the listener.
        console.error("Audio monitor unavailable", err);
        try {
          await audioContext?.close();
        } catch {
          // noop
        }
        audioContextRef.current = null;
        sourceNodeRef.current = null;
        analyserRef.current = null;
        audioMonitorReliableRef.current = false;
        setAudioMonitorReliable(false);
      }
    },
    [stopAudioMonitor],
  );

  // Read through refs so callers never see a stale render's value — the audio
  // verdict is only known inside recorder.onstop, one render too late for a
  // submit handler that awaited stopRecording().
  const getAudioSignalState = useCallback(
    () => ({
      detected: audioSignalDetectedRef.current,
      reliable: audioMonitorReliableRef.current,
    }),
    [],
  );

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const requestStream = useCallback(async () => {
    if (streamRef.current) {
      if (hasUsableAudioTrack(streamRef.current)) {
        return streamRef.current;
      }
      // The audio track died — an unplugged headset, or a device change.
      // Release it before asking for a replacement so the old camera and mic
      // are not left open alongside the new ones.
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (!hasUsableAudioTrack(media)) {
        media.getTracks().forEach((track) => track.stop());
        setError("Microphone is not capturing audio. Please allow mic access.");
        throw new Error("No usable audio track detected");
      }

      streamRef.current = media;
      setStream(media);
      setError("");
      return media;
    } catch (err) {
      console.error(err);
      setError("Camera and microphone permission is required");
      throw err;
    }
  }, []);

  const stopTracks = useCallback(() => {
    clearTimer();
    stopAudioMonitor();

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    if (!streamRef.current) {
      setStream(null);
      return;
    }

    streamRef.current.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    setStream(null);
    setIsRecording(false);
  }, [clearTimer, stopAudioMonitor]);

  const startRecording = useCallback(async () => {
    const activeStream = streamRef.current || (await requestStream());

    if (!hasUsableAudioTrack(activeStream)) {
      setError("Microphone is not capturing audio. Please allow mic access.");
      throw new Error("No usable audio track detected");
    }

    const mimeType = getSupportedRecorderMimeType();
    mimeTypeRef.current = mimeType;

    const recorder = mimeType
      ? new MediaRecorder(activeStream, { mimeType })
      : new MediaRecorder(activeStream);

    chunksRef.current = [];
    setRecordedBlob(null);
    setRecordingSeconds(0);
    setRecordingHasAudioSignal(false);
    audioSignalDetectedRef.current = false;

    // Awaited before the recorder starts so the resume() round-trip cannot
    // swallow the opening moments of the answer.
    await startAudioMonitor(activeStream);

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      stopAudioMonitor();
      const blob = new Blob(chunksRef.current, {
        type: mimeTypeRef.current || recorder.mimeType || "video/webm",
      });
      setRecordedBlob(blob);
      setRecordingHasAudioSignal(audioSignalDetectedRef.current);
      setIsRecording(false);
      clearTimer();
    };

    recorder.start(1000);
    mediaRecorderRef.current = recorder;
    setIsRecording(true);

    timerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  }, [clearTimer, requestStream, startAudioMonitor, stopAudioMonitor]);

  const stopRecording = useCallback(async () => {
    if (
      !mediaRecorderRef.current ||
      mediaRecorderRef.current.state === "inactive"
    ) {
      return null;
    }

    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      recorder.onstop = () => {
        stopAudioMonitor();
        const blob = new Blob(chunksRef.current, {
          type: mimeTypeRef.current || recorder.mimeType || "video/webm",
        });
        setRecordedBlob(blob);
        setRecordingHasAudioSignal(audioSignalDetectedRef.current);
        setIsRecording(false);
        clearTimer();
        resolve(blob);
      };
      recorder.stop();
    });
  }, [clearTimer, stopAudioMonitor]);

  const resetRecording = useCallback(() => {
    setRecordedBlob(null);
    setRecordingSeconds(0);
    setRecordingHasAudioSignal(false);
    setAudioMonitorReliable(false);
    audioSignalDetectedRef.current = false;
    audioMonitorReliableRef.current = false;
    chunksRef.current = [];
  }, []);

  return {
    stream,
    isRecording,
    recordedBlob,
    recordingSeconds,
    recordingHasAudioSignal,
    audioMonitorReliable,
    getAudioSignalState,
    error,
    requestStream,
    startRecording,
    stopRecording,
    stopTracks,
    resetRecording,
  };
}
