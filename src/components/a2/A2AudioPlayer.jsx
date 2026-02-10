import {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  Play,
  Pause,
  PhoneCall,
  AudioLines,
  Megaphone,
  AudioWaveform,
  Volume2,
} from "lucide-react";

// Icon mapping for content types
const TYPE_ICONS = {
  voicemail: PhoneCall,
  monologue: AudioLines,
  announcement: Megaphone,
  dialogue: AudioWaveform,
};

const A2AudioPlayer = forwardRef(function A2AudioPlayer(
  {
    src,
    contentType = "audio",
    onEnded,
    onTimeUpdate,
    onSeek,
    playButtonId,
    onPlayClicked,
  },
  ref,
) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Expose seekTo function to parent via ref
  useImperativeHandle(
    ref,
    () => ({
      seekTo: (time) => {
        if (audioRef.current) {
          audioRef.current.currentTime = time;
          if (!isPlaying) {
            audioRef.current.play();
            setIsPlaying(true);
          }
        }
      },
      play: () => {
        if (audioRef.current && !isPlaying) {
          audioRef.current.play();
          setIsPlaying(true);
        }
      },
      pause: () => {
        if (audioRef.current && isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
      },
    }),
    [isPlaying],
  );

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
        if (onPlayClicked) onPlayClicked();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = (e) => {
    const time = e.target.currentTime;
    setCurrentTime(time);
    if (onTimeUpdate) onTimeUpdate(time);
  };

  const handleLoadedMetadata = (e) => {
    setDuration(e.target.duration);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (onEnded) onEnded();
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const p = (e.clientX - rect.left) / rect.width;
    if (audioRef.current) {
      const newTime = p * duration;
      audioRef.current.currentTime = newTime;
      if (onSeek) onSeek(newTime);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Get display label (capitalize first letter)
  const typeLabel = contentType
    ? contentType.charAt(0).toUpperCase() + contentType.slice(1).toLowerCase()
    : "Audio";

  // Get icon component for the type
  const TypeIcon = TYPE_ICONS[contentType?.toLowerCase()] || Volume2;

  return (
    <div
      className="w-full bg-[#002856] rounded-2xl p-4 text-white shadow-xl flex items-center gap-4 relative overflow-hidden"
      id={playButtonId}
    >
      {/* Subtle background flair */}
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#EDB843] opacity-10 rounded-full blur-2xl" />

      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className="flex-shrink-0 w-12 h-12 rounded-full bg-[#EDB843] text-[#002856] flex items-center justify-center shadow-lg active:scale-95 transition-all hover:bg-[#F4C75D]"
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 fill-current" />
        ) : (
          <Play className="w-5 h-5 fill-current ml-0.5" />
        )}
      </button>

      {/* Center: Waveform + Time */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        <div className="flex items-center justify-between text-xs font-medium text-white/50 uppercase tracking-wider mb-1">
          <span>{typeLabel}</span>
          <span>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Compact Waveform / Progress */}
        <div
          className="w-full h-8 flex items-center cursor-pointer group"
          onClick={handleSeek}
        >
          <div className="flex items-center gap-1 w-full h-full opacity-80">
            {Array.from({ length: 40 }).map((_, i) => {
              const isActive = (i / 40) * 100 < progress;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-all duration-300 ${
                    isActive ? "bg-[#EDB843]" : "bg-white/20"
                  }`}
                  style={{
                    height: isActive
                      ? `${Math.max(30, Math.random() * 100)}%`
                      : "30%",
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Type Icon */}
      <div className="flex-shrink-0 text-white/40">
        <TypeIcon className="w-5 h-5" />
      </div>
    </div>
  );
});

export default A2AudioPlayer;
