import { useState, useRef, useCallback, useEffect } from "react";
import { MicVAD, utils as vadUtils } from "@ricky0123/vad-web";
import ortWasmMjsUrl from "../assets/vad/ort-wasm-simd-threaded.mjs?url";
import ortWasmUrl from "../assets/vad/ort-wasm-simd-threaded.wasm?url";
import api from "../api/axios";

const VAD_ASSET_PATH = "/vad/";
const MAX_MANUAL_RECORDING_MS = 30000;
const MAYA_DEBUG = true;

function mayaDebug(label, payload = {}) {
  if (!MAYA_DEBUG) return;
  console.log(`[B1Maya][debug] ${label}`, payload);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSupportedAudioMimeType() {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return "";
  return [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ].find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function wavBlobFromFloat32(audio) {
  const wavBuffer = vadUtils.encodeWAV(audio, 1, 16000, 1, 16);
  return new Blob([wavBuffer], { type: "audio/wav" });
}

function base64ToArrayBuffer(base64Data) {
  const binaryString = window.atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export default function useB1MayaVAD() {
  const [callState, setCallState] = useState("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [callDuration, setCallDuration] = useState(0);
  const [chatHistory, setChatHistory] = useState([]);
  const [error, setError] = useState(null);
  const [isManualMode, setIsManualModeState] = useState(false);
  const [isManualRecording, setIsManualRecording] = useState(false);
  const [heardTranscript, setHeardTranscript] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [pendingUserTranscript, setPendingUserTranscript] = useState("");
  const [activeTurn, setActiveTurn] = useState(null);
  const [sessionReport, setSessionReport] = useState(null);
  const [vadStatus, setVadStatus] = useState("idle");

  const sessionIdRef = useRef(null);
  const callDurationIntervalRef = useRef(null);
  const audioContextRef = useRef(null);
  const currentAudioSourceRef = useRef(null);
  const vadRef = useRef(null);
  const vadStreamRef = useRef(null);
  const vadTurnRecorderRef = useRef(null);
  const vadTurnRecorderStreamRef = useRef(null);
  const vadTurnChunksRef = useRef([]);
  const liveRecognizerRef = useRef(null);
  const liveTranscriptRef = useRef("");
  const vadStartingRef = useRef(false);
  const uploadInFlightRef = useRef(false);
  const azureTokenRef = useRef({ token: null, region: null, expiresAt: 0 });
  const wakeLockRef = useRef(null);

  const manualStreamRef = useRef(null);
  const manualRecorderRef = useRef(null);
  const manualChunksRef = useRef([]);
  const manualTimerRef = useRef(null);

  const isMutedRef = useRef(false);
  const isAiSpeakingRef = useRef(false);
  const isThinkingRef = useRef(false);
  const isManualModeRef = useRef(false);
  const callStateRef = useRef("idle");

  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { isThinkingRef.current = isThinking; }, [isThinking]);
  useEffect(() => { isManualModeRef.current = isManualMode; }, [isManualMode]);
  useEffect(() => { callStateRef.current = callState; }, [callState]);

  const requestWakeLock = useCallback(async () => {
    if (!("wakeLock" in navigator)) return;
    try {
      if (!wakeLockRef.current) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
        mayaDebug("Screen Wake Lock acquired");
      }
    } catch (err) {
      console.warn("[B1Maya] wake lock request failed:", err.message);
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      try {
        wakeLockRef.current.release();
        mayaDebug("Screen Wake Lock released");
      } catch {}
      wakeLockRef.current = null;
    }
  }, []);

  const stopTimer = useCallback(() => {
    if (callDurationIntervalRef.current) {
      clearInterval(callDurationIntervalRef.current);
      callDurationIntervalRef.current = null;
    }
  }, []);

  const pauseVad = useCallback(async () => {
    try {
      if (vadRef.current?.listening) {
        await vadRef.current.pause();
      }
    } catch (err) {
      console.warn("[B1Maya] VAD pause failed:", err.message);
    }
  }, []);

  const stopLiveTranscription = useCallback(() => {
    const recognizer = liveRecognizerRef.current;
    if (!recognizer) return;

    try {
      recognizer.stopContinuousRecognitionAsync(
        () => {
          try { recognizer.close(); } catch {}
        },
        () => {
          try { recognizer.close(); } catch {}
        }
      );
    } catch (err) {
      console.warn("[B1Maya] stop Azure speech recognition error:", err.message);
    }

    liveRecognizerRef.current = null;
  }, []);

  const getAzureToken = useCallback(async () => {
    const now = Date.now();
    if (azureTokenRef.current.token && azureTokenRef.current.expiresAt > now + 120 * 1000) {
      return azureTokenRef.current;
    }

    const response = await api.get("/b1-maya/speech-token");
    if (!response.data?.success) throw new Error("Failed to get Azure Speech token");
    const { token, region } = response.data;
    azureTokenRef.current = {
      token,
      region,
      expiresAt: Date.now() + 9 * 60 * 1000,
    };
    return azureTokenRef.current;
  }, []);

  const startLiveTranscription = useCallback(async () => {
    stopLiveTranscription();

    const SpeechSDK = window.SpeechSDK;
    if (!SpeechSDK) {
      console.warn("[B1Maya] SpeechSDK global is not available.");
      return;
    }

    try {
      const { token, region } = await getAzureToken();
      const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(token, region);
      speechConfig.speechRecognitionLanguage = "de-DE";

      const stream = vadStreamRef.current;
      if (!stream) {
        console.warn("[B1Maya] No active audio stream for live transcription.");
        return;
      }

      const audioConfig = SpeechSDK.AudioConfig.fromStreamInput(stream);
      const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

      let accumulatedTranscripts = "";

      recognizer.recognizing = (s, e) => {
        const interim = e.result.text || "";
        const cleanPreview = (accumulatedTranscripts + " " + interim).trim();
        liveTranscriptRef.current = cleanPreview;
        setLiveTranscript(cleanPreview);
        mayaDebug("live transcript recognizing", { text: cleanPreview });
      };

      recognizer.recognized = (s, e) => {
        if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
          const finalSegment = e.result.text || "";
          if (finalSegment.trim()) {
            accumulatedTranscripts = (accumulatedTranscripts + " " + finalSegment).trim();
            liveTranscriptRef.current = accumulatedTranscripts;
            setLiveTranscript(accumulatedTranscripts);
            mayaDebug("live transcript recognized", { text: accumulatedTranscripts });
          }
        }
      };

      recognizer.canceled = (s, e) => {
        if (e.reason !== SpeechSDK.CancellationReason.EndOfStream) {
          console.warn("[B1Maya] Azure speech recognition canceled:", e.errorDetails);
        }
      };

      recognizer.sessionStopped = () => {
        mayaDebug("Azure speech recognition session stopped");
      };

      liveRecognizerRef.current = recognizer;
      recognizer.startContinuousRecognitionAsync(
        () => {
          mayaDebug("Azure live transcription started");
        },
        (err) => {
          console.error("[B1Maya] Azure live transcription start failed:", err);
        }
      );
    } catch (err) {
      console.warn("[B1Maya] startLiveTranscription failed:", err.message);
      liveRecognizerRef.current = null;
    }
  }, [getAzureToken, stopLiveTranscription]);

  const discardVadTurnRecording = useCallback(() => {
    if (vadTurnRecorderRef.current && vadTurnRecorderRef.current.state !== "inactive") {
      try {
        vadTurnRecorderRef.current.ondataavailable = null;
        vadTurnRecorderRef.current.onstop = null;
        vadTurnRecorderRef.current.stop();
      } catch {}
    }
    if (vadTurnRecorderStreamRef.current && vadTurnRecorderStreamRef.current !== vadStreamRef.current) {
      vadTurnRecorderStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    vadTurnRecorderRef.current = null;
    vadTurnRecorderStreamRef.current = null;
    vadTurnChunksRef.current = [];
  }, []);

  const createTurnRecorder = useCallback((stream) => {
    const mimeType = getSupportedAudioMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    vadTurnChunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data?.size > 0) vadTurnChunksRef.current.push(event.data);
      mayaDebug("vad recorder chunk", {
        size: event.data?.size || 0,
        type: event.data?.type || "",
        chunks: vadTurnChunksRef.current.length,
      });
    };
    vadTurnRecorderRef.current = recorder;
    vadTurnRecorderStreamRef.current = stream;
    recorder.start(250);
    mayaDebug("vad recorder started", {
      mimeType: recorder.mimeType,
      streamActive: stream.active,
      fallbackStream: stream !== vadStreamRef.current,
      audioTracks: stream.getAudioTracks().map((track) => ({
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
        label: track.label,
      })),
    });
    return true;
  }, []);

  const startVadTurnRecording = useCallback(async () => {
    const stream = vadStreamRef.current;
    if (!stream || typeof MediaRecorder === "undefined") return false;
    if (vadTurnRecorderRef.current?.state === "recording") {
      mayaDebug("vad recorder already recording");
      return true;
    }

    discardVadTurnRecording();
    try {
      return createTurnRecorder(stream);
    } catch (err) {
      console.warn("[B1Maya] turn recorder start failed, retrying:", err.message);
      discardVadTurnRecording();
    }

    await delay(80);
    try {
      return createTurnRecorder(stream);
    } catch (err) {
      console.warn("[B1Maya] turn recorder retry failed, using fallback stream:", err.message);
      discardVadTurnRecording();
    }

    try {
      const fallbackStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      return createTurnRecorder(fallbackStream);
    } catch (err) {
      console.warn("[B1Maya] turn recorder fallback failed:", err.message);
      discardVadTurnRecording();
      return false;
    }
  }, [createTurnRecorder, discardVadTurnRecording]);

  const stopVadTurnRecording = useCallback(() => new Promise((resolve) => {
    const recorder = vadTurnRecorderRef.current;
    if (!recorder) {
      resolve(null);
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      const type = recorder.mimeType || getSupportedAudioMimeType() || "audio/webm";
      const blob = new Blob(vadTurnChunksRef.current, { type });
      mayaDebug("vad recorder stopped", {
        blobSize: blob.size,
        blobType: blob.type,
        chunks: vadTurnChunksRef.current.length,
      });
      vadTurnRecorderRef.current = null;
      if (vadTurnRecorderStreamRef.current && vadTurnRecorderStreamRef.current !== vadStreamRef.current) {
        vadTurnRecorderStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      vadTurnRecorderStreamRef.current = null;
      vadTurnChunksRef.current = [];
      resolve(blob.size > 0 ? blob : null);
    };

    recorder.onstop = finish;
    recorder.onerror = finish;

    try {
      if (recorder.state === "recording") {
        recorder.requestData();
        recorder.stop();
      } else {
        finish();
      }
    } catch {
      finish();
    }
  }), []);

  const armVad = useCallback(async () => {
    if (
      !vadRef.current ||
      vadStartingRef.current ||
      isMutedRef.current ||
      isAiSpeakingRef.current ||
      isThinkingRef.current ||
      isManualModeRef.current ||
      !["active", "ai_speaking"].includes(callStateRef.current)
    ) {
      return;
    }

    try {
      vadStartingRef.current = true;
      setVadStatus("listening");
      await vadRef.current.start();
    } catch (err) {
      console.error("[B1Maya] VAD start failed:", err);
      setVadStatus("error");
      setError("Automatic listening failed. Switch to Push to Talk.");
    } finally {
      vadStartingRef.current = false;
    }
  }, []);

  const cleanupManualRecorder = useCallback((discard = true) => {
    if (manualTimerRef.current) {
      clearTimeout(manualTimerRef.current);
      manualTimerRef.current = null;
    }
    if (manualRecorderRef.current && manualRecorderRef.current.state !== "inactive") {
      if (discard) {
        manualRecorderRef.current.ondataavailable = null;
        manualRecorderRef.current.onstop = null;
      }
      try { manualRecorderRef.current.stop(); } catch {}
    }
    if (manualStreamRef.current) {
      manualStreamRef.current.getTracks().forEach((track) => track.stop());
      manualStreamRef.current = null;
    }
    manualRecorderRef.current = null;
    manualChunksRef.current = [];
    setIsManualRecording(false);
    stopLiveTranscription();
  }, [stopLiveTranscription]);

  const cleanup = useCallback(async () => {
    stopTimer();
    releaseWakeLock();
    uploadInFlightRef.current = false;
    if (currentAudioSourceRef.current) {
      try { currentAudioSourceRef.current.stop(); } catch {}
      currentAudioSourceRef.current = null;
    }
    cleanupManualRecorder(true);
    stopLiveTranscription();
    await stopVadTurnRecording();
    try {
      if (vadRef.current) {
        await vadRef.current.destroy();
      }
    } catch {}
    if (vadStreamRef.current) {
      try {
        vadStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch {}
      vadStreamRef.current = null;
    }
    vadRef.current = null;
    if (audioContextRef.current) {
      try { await audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }
    isAiSpeakingRef.current = false;
    isThinkingRef.current = false;
    setIsThinking(false);
    setIsUserSpeaking(false);
    setMicLevel(0);
    setLiveTranscript("");
    setPendingUserTranscript("");
    liveTranscriptRef.current = "";
    setVadStatus("idle");
  }, [cleanupManualRecorder, stopLiveTranscription, stopTimer, stopVadTurnRecording]);

  const playBase64Audio = useCallback(async (base64Data) => {
    if (!base64Data) {
      isAiSpeakingRef.current = false;
      if (callStateRef.current !== "ending" && callStateRef.current !== "ended") {
        setCallState("active");
        await armVad();
      }
      return;
    }

    try {
      await pauseVad();
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = audioContextRef.current || new AudioCtx();
      audioContextRef.current = ctx;
      if (ctx.state === "suspended") await ctx.resume();

      const decoded = await ctx.decodeAudioData(base64ToArrayBuffer(base64Data).slice(0));
      const source = ctx.createBufferSource();
      source.buffer = decoded;
      source.connect(ctx.destination);

      currentAudioSourceRef.current = source;
      isAiSpeakingRef.current = true;
      setCallState("ai_speaking");
      setVadStatus("maya-speaking");

      source.onended = async () => {
        if (currentAudioSourceRef.current === source) currentAudioSourceRef.current = null;
        isAiSpeakingRef.current = false;
        isThinkingRef.current = false;
        setIsThinking(false);
        if (callStateRef.current !== "ending" && callStateRef.current !== "ended") {
          setCallState("active");
          setVadStatus("listening");
          await armVad();
        }
      };

      source.start();
    } catch (err) {
      console.error("[B1Maya] audio playback failed:", err);
      isAiSpeakingRef.current = false;
      isThinkingRef.current = false;
      setIsThinking(false);
      if (callStateRef.current !== "ending" && callStateRef.current !== "ended") {
        setCallState("active");
        await armVad();
      }
    }
  }, [armVad, pauseVad]);

  const uploadAndRespond = useCallback(async (audioBlob, filename = "maya-turn.webm") => {
    if (!sessionIdRef.current || uploadInFlightRef.current || isThinkingRef.current) return;

    uploadInFlightRef.current = true;
    setPendingUserTranscript(liveTranscriptRef.current);
    isThinkingRef.current = true;
    setIsThinking(true);
    setIsUserSpeaking(false);
    stopLiveTranscription();
    setCallState("thinking");
    setVadStatus("processing");
    await pauseVad();

    try {
      mayaDebug("upload starting", {
        filename,
        blobSize: audioBlob?.size || 0,
        blobType: audioBlob?.type || "",
        preview: liveTranscriptRef.current,
        previewLength: liveTranscriptRef.current.length,
      });
      const formData = new FormData();
      formData.append("sessionId", sessionIdRef.current);
      if (liveTranscriptRef.current) {
        formData.append("clientTranscriptPreview", liveTranscriptRef.current);
      }
      formData.append("audio", audioBlob, filename);

      const response = await api.post("/b1-maya/respond", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const data = response.data || {};
      mayaDebug("upload response", {
        success: data.success,
        needsRetry: data.needsRetry,
        heard: data.heard,
        debug: data.debug,
      });

      if (data.success) {
        const heard = data.heard?.display || data.userTranscript || "";
        setHeardTranscript(heard);
        setPendingUserTranscript("");
        liveTranscriptRef.current = "";
        setLiveTranscript("");
        setActiveTurn(data);

        setChatHistory((prev) => {
          const next = [...prev];
          if (heard) {
            next.push({
              role: "user",
              text: heard,
              heard: data.heard,
              pronunciation: data.pronunciation || data.pronunciationGrading,
              grading: data.pronunciation || data.pronunciationGrading,
              feedback: data.feedback,
            });
          }
          next.push({
            role: "assistant",
            text: data.maya?.text_de || data.text_de || "Danke. Erzaehl mir mehr.",
            feedback: data.feedback?.overall_de || data.feedback_de || "",
            topics: data.topics || null,
            turn: data,
          });
          return next.slice(-30);
        });

        await playBase64Audio(data.maya?.audioBase64 || data.audioBase64);
      } else {
        if (callStateRef.current !== "ending" && callStateRef.current !== "ended") {
          setCallState("active");
          setVadStatus("listening");
          await armVad();
        }
      }
    } catch (err) {
      console.error("[B1Maya] respond error:", err);
      if (callStateRef.current !== "ending" && callStateRef.current !== "ended") {
        setError("Maya konnte diese Antwort nicht verarbeiten. Bitte versuche es noch einmal.");
        setCallState("active");
        setVadStatus("listening");
        await armVad();
      }
    } finally {
      uploadInFlightRef.current = false;
      isThinkingRef.current = false;
      setIsThinking(false);
    }
  }, [armVad, pauseVad, playBase64Audio, stopLiveTranscription]);

  const selectTopic = useCallback(async (topicName) => {
    if (!sessionIdRef.current || uploadInFlightRef.current || isThinkingRef.current) return;

    uploadInFlightRef.current = true;
    isThinkingRef.current = true;
    setIsThinking(true);
    setIsUserSpeaking(false);
    stopLiveTranscription();
    setCallState("thinking");
    setVadStatus("processing");
    await pauseVad();

    setChatHistory((prev) => {
      const next = [...prev];
      next.push({
        role: "user",
        text: topicName,
      });
      return next.slice(-30);
    });

    try {
      const formData = new FormData();
      formData.append("sessionId", sessionIdRef.current);
      formData.append("selectedTopic", topicName);

      const response = await api.post("/b1-maya/respond", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const data = response.data || {};
      mayaDebug("selectTopic response", {
        success: data.success,
        heard: data.heard,
      });

      if (data.success) {
        setHeardTranscript(topicName);
        setPendingUserTranscript("");
        setLiveTranscript("");
        liveTranscriptRef.current = "";
        setActiveTurn(data);

        setChatHistory((prev) => {
          const next = [...prev];
          next.push({
            role: "assistant",
            text: data.maya?.text_de || data.text_de || "Danke. Erzaehl mir mehr.",
            feedback: data.feedback?.overall_de || data.feedback_de || "",
            topics: data.topics || null,
            turn: data,
          });
          return next.slice(-30);
        });

        await playBase64Audio(data.maya?.audioBase64 || data.audioBase64);
      } else {
        if (callStateRef.current !== "ending" && callStateRef.current !== "ended") {
          setCallState("active");
          setVadStatus("listening");
          await armVad();
        }
      }
    } catch (err) {
      console.error("[B1Maya] selectTopic error:", err);
      if (callStateRef.current !== "ending" && callStateRef.current !== "ended") {
        setError("Maya konnte das Thema nicht laden. Bitte versuche es noch einmal.");
        setCallState("active");
        setVadStatus("listening");
        await armVad();
      }
    } finally {
      uploadInFlightRef.current = false;
      isThinkingRef.current = false;
      setIsThinking(false);
    }
  }, [armVad, pauseVad, playBase64Audio, stopLiveTranscription]);

  const createVad = useCallback(async (existingStream) => {
    if (vadRef.current) return vadRef.current;
    const vad = await MicVAD.new({
      model: "v5",
      startOnLoad: false,
      baseAssetPath: VAD_ASSET_PATH,
      onnxWASMBasePath: {
        mjs: ortWasmMjsUrl,
        wasm: ortWasmUrl,
      },
      processorType: "auto",
      positiveSpeechThreshold: 0.35,
      negativeSpeechThreshold: 0.22,
      redemptionMs: 1900,
      preSpeechPadMs: 900,
      minSpeechMs: 650,
      submitUserSpeechOnPause: false,
      getStream: async () => {
        if (existingStream && existingStream.active) {
          vadStreamRef.current = existingStream;
          return existingStream;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        vadStreamRef.current = stream;
        return stream;
      },
      onFrameProcessed: (probabilities) => {
        const speechLevel = probabilities?.isSpeech ?? 0;
        setMicLevel(Math.max(0, Math.min(1, speechLevel)));
      },
      onSpeechStart: () => {
        if (isMutedRef.current || isThinkingRef.current || isAiSpeakingRef.current || isManualModeRef.current) return;
        mayaDebug("vad speech start", {
          callState: callStateRef.current,
          vadListening: vadRef.current?.listening,
        });
        setLiveTranscript("");
        liveTranscriptRef.current = "";
        void startVadTurnRecording();
        startLiveTranscription();
        setIsUserSpeaking(true);
        setVadStatus("speaking");
      },
      onSpeechEnd: async (audio) => {
        stopLiveTranscription();
        const recordedBlob = await stopVadTurnRecording();
        setIsUserSpeaking(false);
        setMicLevel(0);
        if (isMutedRef.current || isThinkingRef.current || isAiSpeakingRef.current || isManualModeRef.current) return;
        mayaDebug("vad speech end", {
          samples: audio?.length || 0,
          recordedBytes: recordedBlob?.size || 0,
          recordedType: recordedBlob?.type || "",
          preview: liveTranscriptRef.current,
          previewLength: liveTranscriptRef.current.length,
        });
        if (recordedBlob?.size > 1500) {
          await uploadAndRespond(recordedBlob, "maya-turn.webm");
          return;
        }
        if (!audio || audio.length < 8000) {
          setVadStatus("listening");
          await armVad();
          return;
        }
        await uploadAndRespond(wavBlobFromFloat32(audio), "maya-turn.wav");
      },
      onVADMisfire: () => {
        stopLiveTranscription();
        discardVadTurnRecording();
        setLiveTranscript("");
        liveTranscriptRef.current = "";
        setIsUserSpeaking(false);
        setVadStatus("listening");
      },
    });
    vadRef.current = vad;
    return vad;
  }, [armVad, discardVadTurnRecording, startLiveTranscription, startVadTurnRecording, stopLiveTranscription, stopVadTurnRecording, uploadAndRespond]);

  const startCall = useCallback(async () => {
    // 1. Synchronously trigger getUserMedia inside user click gesture tick to prevent Webkit/iOS/Safari blocks
    let permissionStream = null;
    try {
      permissionStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err) {
      console.warn("[B1Maya] getUserMedia with constraints failed, retrying with simple constraints:", err);
      try {
        permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (innerErr) {
        console.error("[B1Maya] microphone permission request failed:", innerErr);
        setError("Microphone permission denied. Please allow access in settings.");
        setCallState("idle");
        return;
      }
    }

    await cleanup();
    setError(null);
    setCallState("connecting");
    setCallDuration(0);
    setChatHistory([]);
    setHeardTranscript("");
    setLiveTranscript("");
    setPendingUserTranscript("");
    liveTranscriptRef.current = "";
    setActiveTurn(null);
    setSessionReport(null);
    setIsMuted(false);
    isMutedRef.current = false;
    setVadStatus("initializing");
    requestWakeLock();

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioCtx();
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }

      // Prefetch Azure token in parallel to avoid lag when user starts speaking
      getAzureToken().catch((err) => {
        console.warn("[B1Maya] prefetch token failed:", err.message);
      });

      await createVad(permissionStream);
      const res = await api.post("/b1-maya/start");
      if (!res.data?.success) throw new Error("Maya session did not start");

      sessionIdRef.current = res.data.sessionId;
      callDurationIntervalRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      const greetingText = res.data.maya?.text_de || res.data.greetingText || "Hallo! Ich bin Maya.";
      setChatHistory([{ role: "assistant", text: greetingText }]);
      setCallState("active");
      await playBase64Audio(res.data.maya?.audioBase64 || res.data.audioBase64);
    } catch (err) {
      console.error("[B1Maya] start error:", err);
      setError("Maya konnte nicht starten. Bitte pruefe Mikrofon und Verbindung.");
      if (permissionStream) {
        try {
          permissionStream.getTracks().forEach((track) => track.stop());
        } catch {}
      }
      await cleanup();
      setCallState("idle");
    }
  }, [cleanup, createVad, playBase64Audio]);

  const endCall = useCallback(async () => {
    setCallState("ending");
    stopLiveTranscription();
    await pauseVad();
    if (sessionIdRef.current) {
      try {
        const res = await api.post("/b1-maya/end", {
          sessionId: sessionIdRef.current,
          durationSeconds: callDuration,
        });
        if (res.data?.success) setSessionReport(res.data);
      } catch (err) {
        console.error("[B1Maya] end failed:", err);
      }
    }
    await cleanup();
    setCallState("ended");
  }, [callDuration, cleanup, pauseVad, stopLiveTranscription]);

  const toggleMute = useCallback(async () => {
    const nextMuted = !isMutedRef.current;
    isMutedRef.current = nextMuted;
    setIsMuted(nextMuted);

    if (nextMuted) {
      await pauseVad();
      stopLiveTranscription();
      setIsUserSpeaking(false);
      setMicLevel(0);
      setVadStatus("muted");
    } else {
      setVadStatus("listening");
      await armVad();
    }
  }, [armVad, pauseVad, stopLiveTranscription]);

  const setIsManualMode = useCallback(async (value) => {
    const next = typeof value === "function" ? value(isManualModeRef.current) : value;
    isManualModeRef.current = Boolean(next);
    setIsManualModeState(Boolean(next));
    cleanupManualRecorder(true);
    if (next) {
      await pauseVad();
      setVadStatus("push-to-talk");
    } else {
      setVadStatus("listening");
      await armVad();
    }
  }, [armVad, cleanupManualRecorder, pauseVad]);

  const startManualRecording = useCallback(async () => {
    if (isThinkingRef.current || isAiSpeakingRef.current || uploadInFlightRef.current) return;
    await pauseVad();
    manualChunksRef.current = [];
    setLiveTranscript("");
    startLiveTranscription();
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    manualStreamRef.current = stream;
    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    manualRecorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data?.size > 0) manualChunksRef.current.push(event.data);
    };
    recorder.onstop = async () => {
      stopLiveTranscription();
      const blob = new Blob(manualChunksRef.current, { type: "audio/webm" });
      manualChunksRef.current = [];
      manualStreamRef.current?.getTracks().forEach((track) => track.stop());
      manualStreamRef.current = null;
      setIsManualRecording(false);
      setIsUserSpeaking(false);
      if (blob.size > 0) await uploadAndRespond(blob);
    };
    recorder.start();
    setIsManualRecording(true);
    setIsUserSpeaking(true);
    setVadStatus("manual-recording");
    manualTimerRef.current = setTimeout(() => {
      if (manualRecorderRef.current?.state === "recording") {
        manualRecorderRef.current.stop();
      }
    }, MAX_MANUAL_RECORDING_MS);
  }, [pauseVad, startLiveTranscription, stopLiveTranscription, uploadAndRespond]);

  const toggleManualRecording = useCallback(async () => {
    if (!isManualModeRef.current) return;
    if (isManualRecording && manualRecorderRef.current?.state === "recording") {
      if (manualTimerRef.current) {
        clearTimeout(manualTimerRef.current);
        manualTimerRef.current = null;
      }
      manualRecorderRef.current.stop();
      return;
    }
    try {
      await startManualRecording();
    } catch (err) {
      console.error("[B1Maya] manual recording failed:", err);
      setError("Push to Talk konnte nicht starten.");
      stopLiveTranscription();
      setIsManualRecording(false);
      setIsUserSpeaking(false);
    }
  }, [isManualRecording, startManualRecording, stopLiveTranscription]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState === "visible" && callStateRef.current === "active") {
        await requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [requestWakeLock]);

  return {
    callState,
    isMuted,
    isUserSpeaking,
    isThinking,
    micLevel,
    callDuration,
    chatHistory,
    error,
    isManualMode,
    isManualRecording,
    heardTranscript,
    liveTranscript,
    pendingUserTranscript,
    activeTurn,
    sessionReport,
    vadStatus,
    setIsManualMode,
    startCall,
    endCall,
    toggleMute,
    toggleManualRecording,
    selectTopic,
  };
}
