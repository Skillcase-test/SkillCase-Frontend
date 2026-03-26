import { useCallback, useRef, useState } from "react";

const RECORDER_MIME_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

function getSupportedRecorderMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  for (const mimeType of RECORDER_MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported?.(mimeType)) {
      return mimeType;
    }
  }

  return "";
}

export default function useInterviewRecorder() {
  const [stream, setStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [error, setError] = useState("");

  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const mimeTypeRef = useRef("");

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

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
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
  }, [clearTimer]);

  const startRecording = useCallback(async () => {
    const activeStream = streamRef.current || (await requestStream());
    const mimeType = getSupportedRecorderMimeType();
    mimeTypeRef.current = mimeType;

    const recorder = mimeType
      ? new MediaRecorder(activeStream, { mimeType })
      : new MediaRecorder(activeStream);

    chunksRef.current = [];
    setRecordedBlob(null);
    setRecordingSeconds(0);

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: mimeTypeRef.current || recorder.mimeType || "video/webm",
      });
      setRecordedBlob(blob);
      setIsRecording(false);
      clearTimer();
    };

    recorder.start(1000);
    mediaRecorderRef.current = recorder;
    setIsRecording(true);

    timerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  }, [clearTimer, requestStream]);

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
        const blob = new Blob(chunksRef.current, {
          type: mimeTypeRef.current || recorder.mimeType || "video/webm",
        });
        setRecordedBlob(blob);
        setIsRecording(false);
        clearTimer();
        resolve(blob);
      };
      recorder.stop();
    });
  }, [clearTimer]);

  const resetRecording = useCallback(() => {
    setRecordedBlob(null);
    setRecordingSeconds(0);
    chunksRef.current = [];
  }, []);

  return {
    stream,
    isRecording,
    recordedBlob,
    recordingSeconds,
    error,
    requestStream,
    startRecording,
    stopRecording,
    stopTracks,
    resetRecording,
  };
}
