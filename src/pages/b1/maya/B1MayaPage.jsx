import React from "react";
import useB1MayaVAD from "../../../hooks/useB1MayaVAD";
import LobbyScreen from "./components/LobbyScreen";
import CallScreen from "./components/CallScreen";
import CallEndedScreen from "./components/CallEndedScreen";

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
          onStartCall={startCall}
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
          onEndCall={endCall}
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
