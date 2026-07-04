import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  PhoneCall,
  Sparkles,
  HelpCircle,
  AlertCircle,
} from "lucide-react";
import mayaImg from "../../../../assets/onboarding/mayaSmiling.webp";

export default function LobbyScreen({ onStartCall, isConnecting, error }) {
  const navigate = useNavigate();
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [micPermissionState, setMicPermissionState] = useState("unknown");
  const [loopbackStatus, setLoopbackStatus] = useState("idle");
  const [diagMicLevel, setDiagMicLevel] = useState(0);

  const loopbackRecorderRef = useRef(null);
  const loopbackChunksRef = useRef([]);
  const diagStreamRef = useRef(null);
  const diagContextRef = useRef(null);
  const diagAnimationFrameRef = useRef(null);

  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "microphone" })
        .then((result) => {
          setMicPermissionState(result.state);
          result.onchange = () => {
            setMicPermissionState(result.state);
          };
        })
        .catch(() => {
          setMicPermissionState("unsupported");
        });
    } else {
      setMicPermissionState("unsupported");
    }

    return () => {
      if (diagAnimationFrameRef.current)
        cancelAnimationFrame(diagAnimationFrameRef.current);
      if (diagStreamRef.current)
        diagStreamRef.current.getTracks().forEach((t) => t.stop());
      if (diagContextRef.current) diagContextRef.current.close();
    };
  }, []);

  const toggleDiagVolumeMeter = async (open) => {
    if (open) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        diagStreamRef.current = stream;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        diagContextRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);

        const check = () => {
          const dataArray = new Float32Array(analyser.frequencyBinCount);
          analyser.getFloatTimeDomainData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sum / dataArray.length);
          setDiagMicLevel(rms);
          diagAnimationFrameRef.current = requestAnimationFrame(check);
        };
        check();
      } catch (err) {
        console.error("Diag meter failed:", err);
      }
    } else {
      if (diagAnimationFrameRef.current)
        cancelAnimationFrame(diagAnimationFrameRef.current);
      if (diagStreamRef.current)
        diagStreamRef.current.getTracks().forEach((t) => t.stop());
      if (diagContextRef.current) diagContextRef.current.close();
      setDiagMicLevel(0);
    }
  };

  const startLoopbackTest = async () => {
    try {
      setLoopbackStatus("recording");
      loopbackChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      loopbackRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          loopbackChunksRef.current.push(e.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(loopbackChunksRef.current, {
          type: "audio/webm",
        });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        setLoopbackStatus("playing");
        audio.onended = () => {
          setLoopbackStatus("idle");
          stream.getTracks().forEach((t) => t.stop());
        };
        audio.play().catch((err) => {
          console.error("Loopback play failed:", err);
          setLoopbackStatus("idle");
          stream.getTracks().forEach((t) => t.stop());
        });
      };
      recorder.start();
      setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
        }
      }, 3000);
    } catch (err) {
      console.error("Loopback failed:", err);
      setLoopbackStatus("idle");
    }
  };

  const stopDiag = () => {
    toggleDiagVolumeMeter(false);
    setShowDiagnostics(false);
  };

  const hasMediaRecorder = typeof window.MediaRecorder !== "undefined";
  const hasAudioContext =
    typeof (window.AudioContext || window.webkitAudioContext) !== "undefined";

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col justify-start items-center overflow-hidden w-full">
      <div className="w-full max-w-md px-4 py-3 bg-white flex justify-between items-center z-10">
        <button
          onClick={() => navigate(-1)}
          className="flex justify-center items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer border-0 bg-transparent text-[#0b0f19] text-sm font-semibold font-sans leading-6"
        >
          <ChevronLeft size={16} className="text-black" />
          <span>Back</span>
        </button>
        <button
          onClick={() => {
            setShowDiagnostics(true);
            toggleDiagVolumeMeter(true);
          }}
          className="text-neutral-500 text-sm font-semibold font-sans leading-6 hover:text-[#002856] transition-colors cursor-pointer border-0 bg-transparent"
        >
          Talk to Maya
        </button>
      </div>

      <div className="w-full max-w-md px-4 pt-6 pb-3 flex flex-col justify-center items-center gap-10 flex-1">
        <div className="w-full flex flex-col justify-start items-center gap-3">
          <div className="w-48 h-48 relative bg-blue-600/10 rounded-full flex items-center justify-center animate-[pulse_3s_infinite_ease-in-out]">
            <div className="w-40 h-40 bg-blue-600/20 rounded-full flex items-center justify-center">
              <div className="w-28 h-28 bg-gradient-to-b from-sky-950 to-sky-700 rounded-full overflow-hidden flex items-center justify-center relative shadow-inner">
                <img
                  className="w-full h-full object-cover"
                  src={mayaImg}
                  alt="Maya Avatar"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-start items-center gap-2">
            <h1 className="text-center text-sky-950 text-3xl font-semibold font-sans leading-9">
              Maya
            </h1>
            <p className="text-center text-sky-950 text-base font-semibold font-sans leading-5">
              AI German Tutor
            </p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-md px-4 py-20 flex flex-col justify-start items-center gap-6">
        <p className="w-56 text-center text-black/50 text-xs font-normal font-sans leading-5">
          Have a real conversation in German and get instant feedback
        </p>

        {error && (
          <div className="w-full bg-rose-50 border border-rose-200 rounded-lg px-4 py-2.5 text-rose-700 text-xs flex items-start gap-2 shadow-sm animate-in slide-in-from-top-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <div className="w-full flex flex-col justify-start items-start gap-2">
          <button
            onClick={onStartCall}
            disabled={isConnecting}
            className="w-full px-4 py-3 bg-green-700 hover:bg-green-800 active:scale-98 text-white rounded-lg shadow-[0px_1px_2px_rgba(10,13,18,0.05)] flex justify-center items-center gap-3 overflow-hidden cursor-pointer transition-all border-0 font-sans font-semibold text-base"
          >
            {isConnecting ? (
              <div className="w-5 h-5 rounded-full border-[2.5px] border-white/30 border-t-white animate-spin" />
            ) : (
              <>
                <PhoneCall size={18} className="text-white" />
                <span>Tap to call Maya</span>
              </>
            )}
          </button>

          <button
            onClick={() => navigate(-1)}
            className="w-full px-4 py-3 hover:bg-slate-50 text-blue-950 text-base font-semibold font-sans leading-6 rounded-lg flex justify-center items-center cursor-pointer transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {showDiagnostics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm border border-slate-100 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <h2 className="text-lg font-black text-[#002856] mb-4 flex items-center gap-1.5">
              <Sparkles className="text-[#edb843]" size={18} /> System
              Diagnostic
            </h2>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold">
                  Mic Permission
                </span>
                <span
                  className={`font-bold ${
                    micPermissionState === "granted"
                      ? "text-emerald-600"
                      : "text-rose-500"
                  }`}
                >
                  {micPermissionState === "granted"
                    ? "Granted"
                    : micPermissionState === "denied"
                    ? "Denied"
                    : "Unknown"}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold">
                  MediaRecorder API
                </span>
                <span
                  className={`font-bold ${
                    hasMediaRecorder ? "text-emerald-600" : "text-rose-500"
                  }`}
                >
                  {hasMediaRecorder ? "Supported" : "Unsupported"}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold">
                  AudioContext API
                </span>
                <span
                  className={`font-bold ${
                    hasAudioContext ? "text-emerald-600" : "text-rose-500"
                  }`}
                >
                  {hasAudioContext ? "Supported" : "Unsupported"}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-500">
                  <span>Live Volume (RMS)</span>
                  <span className="font-mono font-bold">
                    {diagMicLevel.toFixed(4)}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-75"
                    style={{ width: `${Math.min(100, diagMicLevel * 400)}%` }}
                  />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-600">
                    Local loopback loop
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    {loopbackStatus === "recording"
                      ? "Recording..."
                      : loopbackStatus === "playing"
                      ? "Playing back..."
                      : "Idle"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal mb-3">
                  Record 3 seconds of sound locally. It will immediately play
                  back so you can verify mic and speaker setup.
                </p>
                <button
                  onClick={startLoopbackTest}
                  disabled={loopbackStatus !== "idle"}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-[#002856] hover:bg-[#001d3e] disabled:opacity-40 transition-all cursor-pointer border-0 shadow-sm"
                >
                  {loopbackStatus === "idle"
                    ? "Start Local Audio Test"
                    : "Testing..."}
                </button>
              </div>
            </div>

            <button
              onClick={stopDiag}
              className="w-full py-3 rounded-2xl border border-slate-200 hover:bg-slate-50 font-bold text-[#002856] text-xs transition-colors cursor-pointer"
            >
              Close Diagnostics
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
