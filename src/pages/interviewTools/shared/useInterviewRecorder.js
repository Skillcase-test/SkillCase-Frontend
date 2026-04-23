import { useCallback, useRef, useState } from "react";

const RECORDER_MIME_CANDIDATES = [
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

function canPlaybackMimeType(mimeType) {
  if (typeof document === "undefined" || !mimeType) {
    return true;
  }

  const video = document.createElement("video");
  const normalized = String(mimeType).split(";")[0];

  return (
    video.canPlayType(mimeType) !== "" ||
    video.canPlayType(normalized) !== ""
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

function hasUsableAudioTrack(mediaStream) {
  if (!mediaStream) return false;
  const audioTracks = mediaStream.getAudioTracks?.() || [];
  if (!audioTracks.length) return false;

  return audioTracks.some(
    (track) =>
      track.readyState === "live" &&
      track.enabled !== false &&
      track.muted !== true,
  );
}

export default function useInterviewRecorder() {
  const [stream, setStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingHasAudioSignal, setRecordingHasAudioSignal] = useState(false);
  const [error, setError] = useState("");

  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const mimeTypeRef = useRef("");
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const monitorRafRef = useRef(null);
  const audioSignalDetectedRef = useRef(false);

  const stopAudioMonitor = useCallback(() => {
    if (monitorRafRef.current) {
      cancelAnimationFrame(monitorRafRef.current);
      monitorRafRef.current = null;
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
    (mediaStream) => {
      stopAudioMonitor();
      audioSignalDetectedRef.current = false;
      setRecordingHasAudioSignal(false);

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx || !mediaStream) {
        return;
      }

      const audioContext = new AudioCtx();
      const source = audioContext.createMediaStreamSource(mediaStream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;

      source.connect(analyser);

      audioContextRef.current = audioContext;
      sourceNodeRef.current = source;
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.fftSize);
      const SILENCE_THRESHOLD = 0.02;

      const tick = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteTimeDomainData(data);
        let peak = 0;
        for (let i = 0; i < data.length; i += 1) {
          const normalized = Math.abs((data[i] - 128) / 128);
          if (normalized > peak) peak = normalized;
        }

        if (peak > SILENCE_THRESHOLD) {
          audioSignalDetectedRef.current = true;
        }

        monitorRafRef.current = requestAnimationFrame(tick);
      };

      monitorRafRef.current = requestAnimationFrame(tick);
    },
    [stopAudioMonitor],
  );

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const requestStream = useCallback(async () => {
    if (streamRef.current) {
      return streamRef.current;
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
    startAudioMonitor(activeStream);

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
    audioSignalDetectedRef.current = false;
    chunksRef.current = [];
  }, []);

  return {
    stream,
    isRecording,
    recordedBlob,
    recordingSeconds,
    recordingHasAudioSignal,
    error,
    requestStream,
    startRecording,
    stopRecording,
    stopTracks,
    resetRecording,
  };
}
