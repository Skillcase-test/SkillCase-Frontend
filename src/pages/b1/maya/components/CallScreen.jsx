import React, { useEffect, useRef } from "react";
import { PhoneOff, Mic, MicOff, Clock4 } from "lucide-react";
import mayaImg from "../../../../assets/onboarding/mayaSmiling.webp";

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const styles = `
  @keyframes goldGlow {
    0% { box-shadow: 0 0 0 0 rgba(237, 184, 67, 0.6); }
    70% { box-shadow: 0 0 0 8px rgba(237, 184, 67, 0); }
    100% { box-shadow: 0 0 0 0 rgba(237, 184, 67, 0); }
  }
  @keyframes blueGlow {
    0% { box-shadow: 0 0 0 0 rgba(0, 40, 86, 0.6); }
    70% { box-shadow: 0 0 0 8px rgba(0, 40, 86, 0); }
    100% { box-shadow: 0 0 0 0 rgba(0, 40, 86, 0); }
  }
  @keyframes fadeSlide {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .maya-avatar-speaking {
    animation: goldGlow 1.8s infinite ease-in-out;
    border: 2px solid #edb843 !important;
  }
  .user-avatar-speaking {
    animation: blueGlow 1.8s infinite ease-in-out;
    border: 2px solid #002856 !important;
  }
`;

export default function CallScreen({
  callState,
  chatHistory,
  isMuted,
  isUserSpeaking,
  isThinking,
  micLevel,
  callDuration,
  isManualMode,
  isManualRecording,
  activeTurn,
  heardTranscript,
  liveTranscript,
  pendingUserTranscript,
  vadStatus,
  setIsManualMode,
  onEndCall,
  onToggleMute,
  onToggleManualRecording,
  onSelectTopic,
}) {
  const isAiSpeaking = callState === "ai_speaking";
  const isEnding = callState === "ending";
  const chatContainerRef = useRef(null);

  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;

    const scrollToBottom = () => {
      el.scrollTop = el.scrollHeight;
    };

    // Scroll immediately
    scrollToBottom();

    // Scroll after a short delay to handle layout transitions
    const timer = setTimeout(scrollToBottom, 100);

    // Scroll when window resizes (e.g., keyboard showing or hiding)
    window.addEventListener("resize", scrollToBottom);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", scrollToBottom);
    };
  }, [
    chatHistory.length,
    isUserSpeaking,
    isThinking,
    isAiSpeaking,
    liveTranscript,
    pendingUserTranscript,
    callState,
  ]);

  const stateLabel = isEnding
    ? "Ending session..."
    : isAiSpeaking
    ? "Maya is speaking..."
    : isThinking
    ? "Processing..."
    : "Maya is listening...";

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-white flex flex-col justify-start items-center overflow-hidden w-full">
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      {/* Top Header Bar */}
      <div className="w-full max-w-md px-4 py-2 bg-white border-b border-black/5 flex justify-between items-center shrink-0">
        <div className="flex justify-start items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-b from-sky-950 to-sky-700 rounded-full overflow-hidden flex items-center justify-center relative shadow-inner transition-all duration-300">
            <img
              className="w-full h-full object-cover"
              src={mayaImg}
              alt="Maya"
            />
          </div>
          <div className="flex flex-col justify-center items-start">
            <span className="text-neutral-900 text-sm font-semibold font-sans">
              Maya
            </span>
            <span className="text-neutral-500 text-[10px] font-medium font-sans leading-3">
              German Tutor
            </span>
          </div>
        </div>

        <div className="flex justify-start items-center gap-1.5">
          <div className="px-2 py-0.5 bg-green-700/10 rounded-full border border-green-700/10 flex items-center justify-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-green-700 rounded-full animate-pulse" />
            <span className="text-green-700 text-xs font-medium font-sans leading-5">
              Live
            </span>
          </div>

          <div className="px-2 py-0.5 bg-black/5 rounded-full border border-black/5 flex items-center justify-center gap-1">
            <Clock4 className="w-3.5 h-3.5 text-blue-950" />
            <span className="text-blue-950 text-xs font-medium font-mono leading-5">
              {formatDuration(callDuration)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Chat Scroll Space */}
      <div
        ref={chatContainerRef}
        className="flex-1 w-full max-w-md overflow-y-auto px-4 pt-6 pb-4 bg-white flex flex-col gap-6 min-h-0"
      >
        {chatHistory.length === 0 && (
          <div className="flex-1 flex items-center justify-center py-12">
            <p className="text-slate-400 text-xs italic">Warte auf Maya...</p>
          </div>
        )}

        {chatHistory.map((msg, i) => {
          const isLast = i === chatHistory.length - 1;
          return msg.role === "assistant" ? (
            <div
              key={i}
              className="flex justify-start items-start gap-3 w-full animate-[fadeSlide_0.3s_ease]"
            >
              <div
                className={`w-10 h-10 bg-gradient-to-b from-sky-950 to-sky-700 rounded-full overflow-hidden shrink-0 flex items-center justify-center relative shadow-inner transition-all duration-300 ${
                  isLast && isAiSpeaking ? "maya-avatar-speaking" : ""
                }`}
              >
                <img
                  className="w-full h-full object-cover"
                  src={mayaImg}
                  alt="Maya"
                />
              </div>
              <div className="p-3 bg-[#E4EFFF] rounded-tr-xl rounded-bl-xl rounded-br-xl max-w-[65%]">
                <p className="text-black text-xs font-normal font-sans leading-relaxed m-0">
                  {msg.text}
                </p>
                {msg.topics && msg.topics.length > 0 && (
                  <div className="mt-3 flex flex-col gap-1.5 w-full animate-[fadeSlide_0.3s_ease]">
                    {msg.topics.map((topic, idx) => (
                      <button
                        key={idx}
                        onClick={() => onSelectTopic && onSelectTopic(topic)}
                        disabled={isEnding}
                        className="w-full px-3 py-1 active:scale-98 text-[#002856] text-xs font-semibold cursor-pointer transition-all flex justify-between items-center text-left border-b border-[#002856]/20"
                      >
                        <span>{topic}</span>
                        <span className="text-[#002856]/50 font-bold ml-2">
                          ›
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div
              key={i}
              className="flex justify-end items-start gap-3 w-full animate-[fadeSlide_0.25s_ease]"
            >
              <div className="p-3 bg-[#F5F5F5] rounded-tl-xl rounded-bl-xl rounded-br-xl max-w-[65%]">
                <p className="text-black text-xs font-normal font-sans leading-relaxed m-0">
                  {msg.text}
                </p>
              </div>
            </div>
          );
        })}

        {/* Live Speaking Indicator/Bubble */}
        {(isUserSpeaking || (isThinking && pendingUserTranscript)) && (
          <div className="flex justify-end items-start gap-3 w-full animate-[fadeSlide_0.25s_ease]">
            <div
              className={`p-3 bg-[#F5F5F5] rounded-tl-xl rounded-bl-xl rounded-br-xl max-w-[65%] transition-all duration-300 ${
                isUserSpeaking ? "user-avatar-speaking" : ""
              }`}
            >
              <p className="text-black text-xs font-normal font-sans leading-relaxed m-0">
                {liveTranscript || pendingUserTranscript || "Sprechen..."}
              </p>
            </div>
          </div>
        )}

        {/* Thinking loading animation */}
        {isThinking && (
          <div className="flex justify-start items-start gap-3 w-full animate-[fadeSlide_0.3s_ease]">
            <div className="w-10 h-10 bg-gradient-to-b from-sky-950 to-sky-700 rounded-full overflow-hidden shrink-0 flex items-center justify-center relative shadow-inner">
              <img
                className="w-full h-full object-cover"
                src={mayaImg}
                alt="Maya"
              />
            </div>
            <div className="p-3 bg-[#E4EFFF] rounded-tr-xl rounded-bl-xl rounded-br-xl">
              <div className="flex items-center gap-1 h-3 px-0.5">
                <div
                  className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-[barWave_0.6s_infinite_alternate]"
                  style={{ animationDelay: "0s" }}
                />
                <div
                  className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-[barWave_0.6s_infinite_alternate]"
                  style={{ animationDelay: "0.2s" }}
                />
                <div
                  className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-[barWave_0.6s_infinite_alternate]"
                  style={{ animationDelay: "0.4s" }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control Actions Panel */}
      <div className="w-full max-w-md px-4 py-20 flex flex-col justify-start items-center gap-3 shrink-0 bg-white">
        {/* Status indicator (Speaking / Listening) */}
        <div className="w-56 text-center text-black/50 text-xs font-normal font-sans leading-5">
          {stateLabel}
        </div>

        {/* Action button triggers */}
        <div className="p-1 flex justify-center items-center gap-2">
          {/* Mute button */}
          <button
            onClick={onToggleMute}
            disabled={isEnding}
            className={`px-4.5 py-3.5 border rounded-lg flex justify-center items-center gap-2.5 overflow-hidden transition-all duration-200 bg-white border-zinc-200 text-black ${
              isEnding
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-slate-50 cursor-pointer"
            }`}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* End Call */}
          <button
            onClick={onEndCall}
            disabled={isEnding}
            className={`px-6 py-3.5 rounded-lg shadow-[inset_0px_0px_0px_1px_rgba(10,13,18,0.18)] outline outline-offset-[-2px] outline-white/10 flex justify-center items-center gap-2 overflow-hidden transition-all border-0 font-semibold text-white text-base font-sans leading-6 ${
              isEnding
                ? "bg-red-400 cursor-not-allowed opacity-80"
                : "bg-red-500 hover:bg-red-600 active:scale-98 cursor-pointer"
            }`}
          >
            {isEnding ? (
              <>
                <div className="w-4.5 h-4.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>Ending...</span>
              </>
            ) : (
              <>
                <PhoneOff size={18} className="text-white" />
                <span>End Call</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
