import { useEffect } from "react";
import { VolumeX } from "lucide-react";
import TypewriterText from "./TypewriterText";
import WaveformIcon from "./WaveformIcon";
import useMayaTTS from "./useMayaTTS";
import { hapticLight } from "../../../../../utils/haptics";

/**
 * MayaDialogueBubble
 *
 * Renders as a Fragment — no wrapper div. Place this inside any bubble
 * container that already has `relative` positioning. The mute button
 * will anchor itself to the top-right corner of that parent.
 *
 * Props:
 *   text      — string to display (typewriter) and speak
 *   onDone    — optional callback fired when typewriter finishes
 *   className — forwarded to the text element
 */
export default function MayaDialogueBubble({
  text,
  onDone,
  className = "",
  skipSuppression = false,
}) {
  const { speak, stop, isSpeaking, isMuted, toggleMute } = useMayaTTS();

  useEffect(() => {
    if (text) speak(text, { skipSuppression });
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, skipSuppression]); // stable useCallback refs — intentionally excluded from deps

  const handleAudioButtonClick = (e) => {
    e.stopPropagation();
    hapticLight();
    if (isMuted) {
      toggleMute(text);
    } else if (isSpeaking) {
      toggleMute();
    } else {
      speak(text, { force: true });
    }
  };

  return (
    <>
      {/* Text — leaves room on the right for the button via pr-8 */}
      <span
        className={`text-black text-sm font-medium leading-snug pr-8 ${className}`}
      >
        <TypewriterText
          text={text}
          onDone={() => {
            hapticLight();
            onDone?.();
          }}
          onCharacter={hapticLight}
        />
      </span>

      {/* Mute toggle / play button — absolute to the parent bubble's relative container */}
      <button
        onClick={handleAudioButtonClick}
        className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center active:scale-90 transition-transform"
        aria-label={
          isMuted
            ? "Unmute Maya"
            : isSpeaking
              ? "Mute Maya"
              : "Play Maya Audio"
        }
      >
        {isMuted ? (
          <VolumeX className="w-4 h-4 text-gray-400" />
        ) : (
          <WaveformIcon
            isPlaying={isSpeaking}
            className="w-4 h-4"
            color="bg-blue-950"
            iconColor="text-blue-950"
          />
        )}
      </button>
    </>
  );
}
