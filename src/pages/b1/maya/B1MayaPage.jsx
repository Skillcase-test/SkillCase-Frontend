import React, { useEffect, useRef } from "react";
import useB1MayaVAD from "../../../hooks/useB1MayaVAD";
import LobbyScreen from "./components/LobbyScreen";
import CallScreen from "./components/CallScreen";
import CallEndedScreen from "./components/CallEndedScreen";
import { trackFlowAction, useFlowJourney } from "../../../telemetry/flow";

export default function B1MayaPage() {
  const {
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
  } = useB1MayaVAD();
  const previousTurnsRef = useRef(0);
  useFlowJourney({
    domain: "maya",
    flowId: "maya_call",
    step: callState,
    entityId: "maya_call",
    attributes: { level: "B1" },
  });

  useEffect(() => {
    if (chatHistory.length <= previousTurnsRef.current) return;
    const latest = chatHistory[chatHistory.length - 1];
    previousTurnsRef.current = chatHistory.length;
    trackFlowAction("maya", "maya_call", "turn_completed", {
      entityId: String(chatHistory.length),
      stepIndex: chatHistory.length - 1,
      attributes: {
        turn_index: chatHistory.length - 1,
        state: latest?.role === "assistant" ? "maya" : "learner",
      },
    });
  }, [chatHistory]);

  const startTrackedCall = async (...args) => {
    trackFlowAction("maya", "maya_call", "call_start_started", {
      lifecycle: "started",
    });
    try {
      const result = await startCall(...args);
      trackFlowAction("maya", "maya_call", "call_connected", {
        lifecycle: "succeeded",
      });
      return result;
    } catch (callError) {
      trackFlowAction("maya", "maya_call", "call_start_failed", {
        lifecycle: "failed",
        reasonCode: callError?.name || "start_failed",
      });
      throw callError;
    }
  };

  const endTrackedCall = async (...args) => {
    const result = await endCall(...args);
    trackFlowAction("maya", "maya_call", "call_ended", {
      lifecycle: "succeeded",
      attributes: {
        recording_duration_ms: callDuration * 1000,
        total_turns: chatHistory.length,
      },
    });
    return result;
  };

  const isLobby = callState === "idle" || callState === "connecting";
  const isCallActive =
    callState === "active" ||
    callState === "ai_speaking" ||
    callState === "thinking" ||
    callState === "ending";
  const isEnded = callState === "ended";

  return (
    <>
      {isLobby && (
        <LobbyScreen
          onStartCall={startTrackedCall}
          isConnecting={callState === "connecting"}
          error={error}
        />
      )}

      {isCallActive && (
        <CallScreen
          callState={callState}
          chatHistory={chatHistory}
          isMuted={isMuted}
          isUserSpeaking={isUserSpeaking}
          isThinking={isThinking}
          micLevel={micLevel}
          callDuration={callDuration}
          isManualMode={isManualMode}
          isManualRecording={isManualRecording}
          heardTranscript={heardTranscript}
          liveTranscript={liveTranscript}
          pendingUserTranscript={pendingUserTranscript}
          activeTurn={activeTurn}
          vadStatus={vadStatus}
          setIsManualMode={setIsManualMode}
          onEndCall={endTrackedCall}
          onToggleMute={toggleMute}
          onToggleManualRecording={toggleManualRecording}
          onSelectTopic={selectTopic}
        />
      )}

      {isEnded && (
        <CallEndedScreen
          callDuration={callDuration}
          chatHistory={chatHistory}
          sessionReport={sessionReport}
        />
      )}

      <style>{`
        @keyframes barWave   { from{transform:scaleY(.4)} to{transform:scaleY(1)} }
        @keyframes fadeSlide { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </>
  );
}
