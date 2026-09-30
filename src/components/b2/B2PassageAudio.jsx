import { Loader2, Square, Volume2 } from "lucide-react";

export default function B2PassageAudio({ isSpeaking, isLoadingAudio, onListen }) {
  const active = isSpeaking || isLoadingAudio;
  const Icon = isLoadingAudio ? Loader2 : isSpeaking ? Square : Volume2;

  return <button
    type="button"
    className="b2-passage-audio"
    onClick={onListen}
    aria-pressed={active}
    aria-label={isLoadingAudio ? "Cancel audio loading" : isSpeaking ? "Stop reading aloud" : "Read passage aloud"}
  >
    <span className="b2-passage-audio-face">
      <Icon size={14} aria-hidden="true" className={isLoadingAudio ? "animate-spin" : undefined} />
      <span>{isLoadingAudio ? "Cancel" : isSpeaking ? "Stop" : "Listen"}</span>
    </span>
    <span className="sr-only" role="status">{isLoadingAudio ? "Loading passage audio" : isSpeaking ? "Reading passage aloud" : ""}</span>
  </button>;
}
