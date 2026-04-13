import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Play,
  Pause,
  Headphones,
  Loader2,
  ArrowRight,
  BookOpen,
  EarIcon,
  PhoneCall,
  AudioLines,
  Megaphone,
  AudioWaveform,
  Volume2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  getListeningContent,
  saveListeningProgress,
  checkListeningAnswers,
} from "../../../api/a1Api";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  pointerWithin,
  rectIntersection,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import KaraokeSubtitles from "../../../components/a2/KaraokeSubtitles";
import A2AudioPlayer from "../../../components/a2/A2AudioPlayer";

import api from "../../../api/axios";
import FloatingStreakCounter from "../../../components/FloatingStreakCounter";
import StreakCelebrationModal from "../../../components/StreakCelebrationModal";
import useTextToSpeech from "../../pronounce/hooks/useTextToSpeech";
import { usePostHog } from "@posthog/react";

const CustomDropdown = ({
  options,
  value,
  onChange,
  disabled,
  isCorrect,
  isWrong,
  placeholder = "Select...",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  // Handle outside click and scroll to close
  useEffect(() => {
    const handleInteraction = (event) => {
      // If clicking inside the dropdown button, let the toggle handler manage it
      if (dropdownRef.current && dropdownRef.current.contains(event.target)) {
        return;
      }
      // If clicking completely outside or scrolling, close it
      setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleInteraction);
      window.addEventListener("scroll", handleInteraction, true); // Capture scroll
      window.addEventListener("resize", () => setIsOpen(false));
    }
    return () => {
      document.removeEventListener("mousedown", handleInteraction);
      window.removeEventListener("scroll", handleInteraction, true);
      window.removeEventListener("resize", () => setIsOpen(false));
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    if (disabled) return;

    if (!isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const selectedLabel =
    value !== undefined && value !== null ? options[value] : placeholder;

  let borderClass = isOpen
    ? "border-[#002856] ring-2 ring-[#002856]/10"
    : "border-gray-200";
  let bgClass = "bg-white";
  let textClass = "text-gray-700 font-medium";

  if (disabled) {
    if (isCorrect) {
      borderClass = "border-green-500 bg-green-50";
      textClass = "text-green-700 font-medium";
    } else if (isWrong) {
      borderClass = "border-red-500 bg-red-50";
      textClass = "text-red-700 font-medium";
    } else {
      borderClass = "border-gray-200 bg-gray-50";
      textClass = "text-gray-500";
    }
  } else if (value !== undefined && value !== null) {
    borderClass = "border-[#002856] bg-[#edfaff]";
    textClass = "text-[#002856] font-medium";
  }

  return (
    <div className="relative flex-1 min-w-[140px]" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        disabled={disabled}
        className={`w-full p-3 rounded-xl border-2 flex items-center justify-between transition-all ${borderClass} ${bgClass} ${textClass}`}
      >
        <span className="mr-2 text-left">{selectedLabel}</span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen &&
        !disabled &&
        createPortal(
          <div
            className="fixed z-[9999] bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100"
            style={{
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
            }}
          >
            <div className="p-1">
              {options.map((opt, idx) => (
                <button
                  key={idx}
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent blur before click
                    onChange(idx);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    value === idx
                      ? "bg-[#edfaff] text-[#002856]"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

// Drag-and-drop sentence ordering components
function WordItem({ word, isDragging, isOverlay }) {
  return (
    <div
      className={`px-4 py-2.5 rounded-xl font-semibold text-base select-none touch-none transition-all ${
        isOverlay
          ? "bg-[#002856] text-white shadow-2xl scale-110 cursor-grabbing z-50"
          : isDragging
            ? "opacity-30 scale-95 bg-gray-200"
            : "bg-white text-[#002856] border-2 border-[#002856] shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md hover:-translate-y-0.5"
      }`}
    >
      {word}
    </div>
  );
}

function DraggableWord({ id, word }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <WordItem word={word} isDragging={isDragging} />
    </div>
  );
}

function SentenceOrderingInline({
  question,
  onAnswer,
  showResult,
  isCorrect,
  userAnswer,
}) {
  const words = question.words || [];
  const correctOrder = question.correct_order || [];
  const hintEn = question.hint_en || "";

  const [orderedWords, setOrderedWords] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [activeWord, setActiveWord] = useState(null);

  useEffect(() => {
    if (words.length > 0 && orderedWords.length === 0) {
      // Shuffle words initially
      const shuffled = [...words].sort(() => Math.random() - 0.5);
      setOrderedWords(shuffled);
    }
  }, [words]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const customCollisionDetection = (args) => {
    const pointer = pointerWithin(args);
    if (pointer.length > 0) return pointer;
    const rect = rectIntersection(args);
    if (rect.length > 0) return rect;
    return closestCenter(args);
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
    setActiveWord(orderedWords.find((w) => w === event.active.id));
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveWord(null);
    if (active.id !== over?.id && over) {
      const oldIndex = orderedWords.indexOf(active.id);
      const newIndex = orderedWords.indexOf(over.id);
      const newOrder = arrayMove(orderedWords, oldIndex, newIndex);
      setOrderedWords(newOrder);
      setTimeout(() => onAnswer(newOrder), 0);
    }
  };

  return (
    <div className="space-y-4">
      {hintEn && (
        <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
          <p className="text-sm font-medium text-blue-800">
            <span className="text-blue-600">Hint: </span>"{hintEn}"
          </p>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={orderedWords}
          strategy={horizontalListSortingStrategy}
        >
          <div
            className={`flex flex-wrap gap-3 p-4 rounded-xl min-h-[80px] border-2 border-dashed ${
              showResult
                ? isCorrect
                  ? "border-green-400 bg-green-50"
                  : "border-red-400 bg-red-50"
                : "border-gray-300 bg-gray-50"
            }`}
          >
            {orderedWords.map((word) => (
              <DraggableWord key={word} id={word} word={word} />
            ))}
          </div>
        </SortableContext>
        <DragOverlay dropAnimation={null}>
          {activeId && activeWord ? (
            <WordItem word={activeWord} isOverlay={true} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {showResult && (
        <div
          className={`p-4 rounded-xl ${
            isCorrect
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          <p
            className={`font-medium ${
              isCorrect ? "text-green-700" : "text-red-700"
            }`}
          >
            {isCorrect ? (
              "✓ Correct! Well done!"
            ) : (
              <>
                ✗ Not quite right.
                <br />
                <span className="text-sm text-green-600">
                  Correct: <strong>"{correctOrder.join(" ")}"</strong>
                </span>
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

function TtsOptionButton({ text, language = "de-DE" }) {
  const { isSpeaking, isLoadingAudio, speakText } = useTextToSpeech();

  if (!text) return null;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        speakText(text, language);
      }}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 font-semibold text-sm transition-colors ${
        isSpeaking
          ? "border-[#002856] bg-[#002856] text-white"
          : "border-[#002856] text-[#002856] bg-white hover:bg-[#edfaff]"
      }`}
    >
      {isLoadingAudio ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isSpeaking ? (
        <Pause className="w-4 h-4" />
      ) : (
        <Play className="w-4 h-4" />
      )}
      {isSpeaking ? "Playing..." : "Play Audio"}
    </button>
  );
}

function UmlautKeyboard({ onInsert, disabled }) {
  const chars = ["ä", "ö", "ü", "ß", "Ä", "Ö", "Ü"];
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {chars.map((char) => (
        <button
          key={char}
          type="button"
          onClick={() => onInsert(char)}
          disabled={disabled}
          className="px-2.5 py-1 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-[#002856] transition-colors disabled:opacity-40"
        >
          {char}
        </button>
      ))}
    </div>
  );
}

// Question types that render via TTS — no audio_url or text label needed in JSON
const AUDIO_QUESTION_TYPES = new Set(["audio_mcq"]);

export default function A1ListeningContent() {
  const { chapterId } = useParams();
  const navigate = useNavigate();
  const posthog = usePostHog();

  const [content, setContent] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  // Phase removed - now single page layout

  // Audio player state
  const audioRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeSubIndex, setActiveSubIndex] = useState(-1);
  const [showSubtitles, setShowSubtitles] = useState(false);

  // Question state
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Streak tracking ---
  const [showStreakCelebration, setShowStreakCelebration] = useState(false);
  const [dailyGoalReached, setDailyGoalReached] = useState(false);
  const [streakInfo, setStreakInfo] = useState({
    todayFlashcards: 0,
    dailyGoal: 20,
    streakDays: 0,
  });

  const [localStreakCount, setLocalStreakCount] = useState(0);

  useEffect(() => {
    api
      .get("/streak")
      .then((res) => {
        if (res.data) {
          setStreakInfo((p) => ({
            ...p,
            todayFlashcards: res.data.todayPoints,
            dailyGoal: res.data.dailyGoal,
            streakDays: res.data.currentStreak,
          }));
          setLocalStreakCount(res.data.todayPoints);
          if (res.data.dailyGoalMet) setDailyGoalReached(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleStreakComplete = useCallback(() => {
    setDailyGoalReached(true);
    setShowStreakCelebration(true);
  }, []);

  const currentItem = content[currentIndex];

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      try {
        const res = await getListeningContent(chapterId);
        const data = res?.data || res || [];
        setContent(Array.isArray(data) ? data : []);
        posthog?.capture("learning_module_started", {
          module: "A1 Listening",
          level: "A1",
          chapter_id: chapterId,
          total_items: Array.isArray(data) ? data.length : 0,
        });
      } catch (err) {
        console.error("Error fetching listening content:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [chapterId]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const subtitles = currentItem?.subtitles || [];

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      const idx = subtitles.findIndex(
        (s) => audio.currentTime >= s.start && audio.currentTime < s.end,
      );
      setActiveSubIndex(idx);
    };
    const onLoaded = () => setDuration(audio.duration);
    const onEnd = () => {
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnd);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnd);
    };
  }, [currentItem]);

  const togglePlay = () => {
    if (audioRef.current) {
      isPlaying ? audioRef.current.pause() : audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const seek = (time) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.seekTo(time);
    }
  };

  const formatTime = (s) => {
    if (!s || isNaN(s)) return "00:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m.toString().padStart(2, "0")}:${sec
      .toString()
      .padStart(2, "0")}`;
  };

  // Get icon based on content type
  const getTypeIcon = (type) => {
    const iconClass = "w-5 h-5";
    switch (type?.toLowerCase()) {
      case "voicemail":
        return <PhoneCall className={iconClass} />;
      case "monologue":
        return <AudioLines className={iconClass} />;
      case "announcement":
        return <Megaphone className={iconClass} />;
      case "dialogue":
        return <AudioWaveform className={iconClass} />;
      default:
        return <Volume2 className={iconClass} />;
    }
  };

  // Format type label with first letter capitalized
  const formatTypeLabel = (type) => {
    if (!type) return "Audio";
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  };

  const handleAnswer = (qIndex, answer) => {
    setAnswers({ ...answers, [qIndex]: answer });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await checkListeningAnswers({
        contentId: currentItem.id,
        answers: Object.values(answers),
      });
      posthog?.capture("learning_module_submitted", {
        module: "A1 Listening",
        level: "A1",
        chapter_id: chapterId,
        content_id: currentItem.id,
        question_count: currentItem.questions?.length || 0,
      });
      posthog?.capture("listening_quiz_submitted", {
        module: "A1 Listening",
        level: "A1",
        chapter_id: chapterId,
        content_id: currentItem.id,
        question_count: currentItem.questions?.length || 0,
      });
      // Don't show score, just show answers
      setResults(res.data);
      setShowAnswers(true);
      await saveListeningProgress({
        contentId: currentItem.id,
        questionIndex: currentItem.questions?.length || 0,
        isCompleted: true,
        score: res.data.score,
      });

      // Streak: +1 per question attempted
      const questionCount = currentItem.questions?.length || 0;
      if (questionCount > 0) {
        setLocalStreakCount((prev) => prev + questionCount);
        api
          .post("/streak/log", { points: questionCount })
          .then((streakRes) => {
            if (streakRes.data.streakUpdated) {
              setStreakInfo({
                todayFlashcards: streakRes.data.todayPoints,
                dailyGoal: streakRes.data.dailyGoal,
                streakDays: streakRes.data.currentStreak || 1,
              });
              setDailyGoalReached(true);
              setShowStreakCelebration(true);
            }
          })
          .catch(() =>
            setLocalStreakCount((prev) => Math.max(0, prev - questionCount)),
          );
      }
    } catch (err) {
      console.error("Error checking answers:", err);
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleTryAgain = () => {
    setAnswers({});
    setShowAnswers(false);
    setResults(null);
  };

  const goToScreen = (targetIndex) => {
    if (targetIndex < 0 || targetIndex >= content.length) return;

    if (audioPlayerRef.current?.pause) {
      audioPlayerRef.current.pause();
    }

    setCurrentIndex(targetIndex);
    setAnswers({});
    setResults(null);
    setShowAnswers(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setActiveSubIndex(-1);
    setDuration(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleContinue = () => {
    if (currentIndex < content.length - 1) {
      goToScreen(currentIndex + 1);
    } else {
      posthog?.capture("learning_module_completed", {
        module: "A1 Listening",
        level: "A1",
        chapter_id: chapterId,
        content_id: currentItem?.id,
      });
      navigate("/a1/listening");
    }
  };

  const handleNext = () => {
    if (currentIndex < content.length - 1) {
      goToScreen(currentIndex + 1);
    } else {
      navigate("/a1/listening");
    }
  };

  const screenWindow = (() => {
    if (content.length <= 2) {
      return Array.from({ length: content.length }, (_, i) => i);
    }
    if (currentIndex === 0) return [0, 1];
    if (currentIndex === content.length - 1)
      return [content.length - 2, content.length - 1];
    return [currentIndex, currentIndex + 1];
  })();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
      </div>
    );
  }

  if (content.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Headphones className="w-16 h-16 text-gray-300 mb-4" />
        <p className="text-gray-500 text-center">
          No listening content available for this chapter yet.
        </p>
        <button
          onClick={() => navigate("/a1/listening")}
          className="mt-4 px-6 py-2 bg-[#002856] text-white rounded-lg"
        >
          Go Back
        </button>
      </div>
    );
  }

  const progress = duration ? (currentTime / duration) * 100 : 0;
  const subtitles = currentItem?.subtitles || [];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[#E5E7EB] gap-2">
        <button
          onClick={() => navigate("/a1/listening")}
          className="flex items-center gap-2 text-sm font-semibold text-[#181d27]"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-1">
          {currentIndex > 0 && (
            <button
              onClick={() => goToScreen(currentIndex - 1)}
              className="w-7 h-7 rounded-full border border-[#d8dee8] text-[#002856] hover:bg-[#edfaff] flex items-center justify-center"
              aria-label="Previous screen"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {screenWindow.map((screenIdx) => {
            const isActive = screenIdx === currentIndex;
            return (
              <button
                key={screenIdx}
                onClick={() => goToScreen(screenIdx)}
                className={`min-w-7 h-7 px-2 rounded-full text-xs font-bold transition-colors ${
                  isActive
                    ? "bg-[#002856] text-white"
                    : "bg-white border border-[#d8dee8] text-[#002856] hover:bg-[#edfaff]"
                }`}
              >
                {screenIdx + 1}
              </button>
            );
          })}

          {currentIndex < content.length - 1 && (
            <button
              onClick={() => goToScreen(currentIndex + 1)}
              className="w-7 h-7 rounded-full border border-[#d8dee8] text-[#002856] hover:bg-[#edfaff] flex items-center justify-center"
              aria-label="Next screen"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        <span className="text-sm font-semibold text-[#7b7b7b]">Listen</span>
      </div>

      {/* Progress */}
      <div className="px-4 py-2">
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#019035] transition-all"
            style={{ width: `${((currentIndex + 1) / content.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Audio Player - Sticky on scroll (offset for navbar) */}
      <div className="sticky top-14 z-50 px-4 py-3">
        <A2AudioPlayer
          ref={audioPlayerRef}
          src={currentItem?.audio_url}
          contentType={currentItem?.content_type}
          onEnded={() => setIsPlaying(false)}
          onTimeUpdate={(time) => setCurrentTime(time)}
          playButtonId="A1-listening-play-btn"
        />
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="space-y-4">
          {/* Karaoke Subtitles */}
          {subtitles.length > 0 && (
            <KaraokeSubtitles
              subtitles={subtitles}
              currentTime={currentTime}
              isVisible={showSubtitles}
              onToggle={() => setShowSubtitles(!showSubtitles)}
              onSeek={seek}
              subtitleButtonId="A1-listening-subtitle-btn"
              subtitlesAreaId="A1-listening-subtitles-area"
              subtitleToggleEventName="tour:A1ListeningSubtitle"
            />
          )}

          {/* Questions Section */}
          {currentItem?.questions?.length > 0 && (
            <div id="A1-listening-questions-section">
              {/* Header with question count */}
              <div className="flex items-center justify-between mb-2 mt-6">
                <h2 className="text-xl font-bold text-[#002856]">
                  {currentItem?.title}
                </h2>
                <span className="text-sm font-medium text-gray-500">
                  {currentItem.questions.length} Questions
                </span>
              </div>

              {currentItem.questions.map((q, qIdx) => {
                const userAns = answers[qIdx];
                const getOptionValue = (opt) => {
                  if (opt && typeof opt === "object") {
                    return opt.value ?? opt.text ?? opt.label ?? "";
                  }
                  return opt;
                };
                const getOptionImage = (opt) => {
                  if (opt && typeof opt === "object") {
                    return opt.image_url || opt.image || null;
                  }
                  return null;
                };
                const getOptionLabel = (opt) => {
                  if (opt && typeof opt === "object") {
                    return opt.text ?? opt.label ?? opt.value ?? "";
                  }
                  return opt;
                };

                const getOptionAudio = (opt) => {
                  if (opt && typeof opt === "object") {
                    return opt.audio_url || opt.audio || null;
                  }
                  return null;
                };

                // Calculate isCorrect based on question type
                let isCorrect = false;
                const qType = String(q.type || "").toLowerCase();

                if (qType === "true_false" || qType === "truefalse") {
                  isCorrect = userAns === q.correct;
                } else if (
                  qType === "dialogue_dropdown" ||
                  qType === "dialogue_fill_dropdown"
                ) {
                  // For dialogue, check all dropdown answers
                  if (userAns && typeof userAns === "object") {
                    isCorrect =
                      q.dialogue?.every((d, idx) => {
                        if (d.text === null && d.options) {
                          return userAns[idx] === d.correct;
                        }
                        return true;
                      }) ?? false;
                  }
                } else if (qType === "mcq_multi") {
                  // Multi-select: compare selected option TEXTS to correct array
                  const correctArr = q.correct || [];
                  const userArr = Array.isArray(userAns) ? userAns : [];
                  // Convert user indices to option texts for comparison
                  const userTexts = userArr
                    .map((idx) => getOptionValue(q.options?.[idx]))
                    .filter(Boolean);
                  isCorrect =
                    correctArr.length === userTexts.length &&
                    correctArr.every((c) => userTexts.includes(c));
                } else if (
                  qType === "fill_typing" ||
                  qType === "fill_blank_typing" ||
                  qType === "sentence_correction"
                ) {
                  // Text input: compare strings (case-insensitive, trimmed, punctuation-stripped)
                  const stripPunctuation = (str) =>
                    str
                      .replace(/[.,!?;:'"()]/g, "")
                      .replace(/\s+/g, " ")
                      .trim();
                  const correctText = stripPunctuation(
                    (
                      q.correct ||
                      q.correct_answer ||
                      q.correct_sentence ||
                      ""
                    ).toLowerCase(),
                  );
                  const userText = stripPunctuation(
                    (userAns || "").toLowerCase(),
                  );
                  isCorrect = userText === correctText;
                } else if (
                  qType === "sentence_ordering" ||
                  qType === "sentence_reorder"
                ) {
                  // Sentence ordering: compare arrays
                  const correctOrder = q.correct_order || [];
                  const userOrder = Array.isArray(userAns) ? userAns : [];
                  isCorrect =
                    correctOrder.length === userOrder.length &&
                    correctOrder.every((word, idx) => userOrder[idx] === word);
                } else if (
                  qType === "fill_options" ||
                  qType === "fill_blank_options" ||
                  qType === "listen_select_dropdown"
                ) {
                  // Options: compare selected option to correct
                  isCorrect = userAns === q.correct;
                } else {
                  // MCQ single - compare option text to correct text
                  const selectedOpt = q.options?.[userAns];
                  const selectedValue = getOptionValue(selectedOpt);
                  isCorrect =
                    userAns !== undefined &&
                    (selectedValue === q.correct || userAns === q.correct);
                }

                return (
                  <div key={qIdx}>
                    <p className="text-sm text-gray-400 mb-2 mt-2 font-semibold">
                      Question {qIdx + 1} of {currentItem.questions.length}
                    </p>
                    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                      {AUDIO_QUESTION_TYPES.has(qType) ? (
                        <div className="mb-2">
                          <TtsOptionButton text={q.question} />
                        </div>
                      ) : (
                        <p className="font-medium text-gray-800 mb-2">
                          {q.question ||
                            (qType === "dialogue_dropdown" ||
                            qType === "dialogue_fill_dropdown"
                              ? "Complete with the correct dialogue"
                              : "")}
                        </p>
                      )}

                      {q.type === "true_false" ? (
                        <div className="flex gap-3">
                          {[true, false].map((val, i) => {
                            const isSelected = userAns === val;
                            const isCorrectOption = val === q.correct;
                            let btnClass =
                              "border-gray-200 bg-white hover:border-gray-300";

                            if (showAnswers) {
                              if (isCorrectOption)
                                btnClass =
                                  "border-green-500 bg-green-50 text-green-700";
                              else if (isSelected)
                                btnClass =
                                  "border-red-500 bg-red-50 text-red-700";
                            } else if (isSelected) {
                              btnClass =
                                "border-[#002856] bg-[#edfaff] text-[#002856]";
                            }

                            return (
                              <button
                                key={i}
                                onClick={() =>
                                  !showAnswers && handleAnswer(qIdx, val)
                                }
                                disabled={showAnswers}
                                className={`flex-1 py-3 rounded-xl border-2 font-medium transition-all ${btnClass}`}
                              >
                                {val ? "True" : "False"}
                              </button>
                            );
                          })}
                        </div>
                      ) : qType === "dialogue_dropdown" ||
                        qType === "dialogue_fill_dropdown" ? (
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-4 mt-2">
                          {q.dialogue?.map((line, lineIdx) => {
                            const lineAnswer = userAns?.[lineIdx];
                            const hasOptions =
                              line.options && line.text === null;
                            const isLineCorrect = lineAnswer === line.correct;

                            return (
                              <div
                                key={lineIdx}
                                className="flex flex-col gap-1 w-full"
                              >
                                <div className="flex items-start gap-3 w-full">
                                  <span className="font-bold text-gray-800 text-lg shrink-0 mt-3.5">
                                    {line.speaker}:
                                  </span>
                                  {hasOptions ? (
                                    <CustomDropdown
                                      options={line.options}
                                      value={lineAnswer}
                                      onChange={(val) => {
                                        const newAns = {
                                          ...userAns,
                                          [lineIdx]: val,
                                        };
                                        handleAnswer(qIdx, newAns);
                                      }}
                                      disabled={showAnswers}
                                      isCorrect={showAnswers && isLineCorrect}
                                      isWrong={
                                        showAnswers &&
                                        !isLineCorrect &&
                                        lineAnswer !== undefined
                                      }
                                    />
                                  ) : (
                                    <span className="text-gray-700 text-lg flex-1 py-3">
                                      {line.text}
                                    </span>
                                  )}
                                </div>
                                {showAnswers &&
                                  hasOptions &&
                                  !isLineCorrect && (
                                    <div className="text-sm text-green-600 ml-9">
                                      Correct:{" "}
                                      <span className="font-medium">
                                        {line.options[line.correct]}
                                      </span>
                                    </div>
                                  )}
                              </div>
                            );
                          })}
                        </div>
                      ) : qType === "mcq_multi" ? (
                        /* MCQ Multi-select */
                        <div className="space-y-2">
                          <p className="text-sm text-gray-500 mb-2">
                            Select all that apply
                          </p>
                          {q.options?.map((opt, i) => {
                            const correctArr = q.correct || [];
                            const userArr = Array.isArray(userAns)
                              ? userAns
                              : [];
                            const isSelected = userArr.includes(i);
                            const isCorrectOption =
                              correctArr.includes(i) ||
                              correctArr.includes(opt);
                            let btnClass =
                              "border-gray-200 bg-gray-50 hover:border-gray-300";

                            if (showAnswers) {
                              if (isCorrectOption)
                                btnClass =
                                  "border-green-500 bg-green-50 text-green-700";
                              else if (isSelected)
                                btnClass =
                                  "border-red-500 bg-red-50 text-red-700";
                            } else if (isSelected) {
                              btnClass =
                                "border-[#002856] bg-[#edfaff] text-[#002856]";
                            }

                            return (
                              <button
                                key={i}
                                onClick={() => {
                                  if (showAnswers) return;
                                  const current = Array.isArray(userAns)
                                    ? [...userAns]
                                    : [];
                                  const idx = current.indexOf(i);
                                  if (idx > -1) current.splice(idx, 1);
                                  else current.push(i);
                                  handleAnswer(qIdx, current);
                                }}
                                disabled={showAnswers}
                                className={`w-full p-3.5 rounded-xl border-2 text-left font-medium transition-all ${btnClass}`}
                              >
                                <span className="flex items-center gap-3">
                                  <span
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                      showAnswers && isCorrectOption
                                        ? "border-green-500 bg-green-500"
                                        : showAnswers && isSelected
                                          ? "border-red-500 bg-red-500"
                                          : isSelected
                                            ? "border-[#002856] bg-[#002856]"
                                            : "border-gray-300"
                                    }`}
                                  >
                                    {isSelected && (
                                      <svg
                                        className="w-3 h-3 text-white"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={3}
                                          d="M5 13l4 4L19 7"
                                        />
                                      </svg>
                                    )}
                                  </span>
                                  <span className="flex-1">
                                    {getOptionImage(opt) && (
                                      <img
                                        src={getOptionImage(opt)}
                                        alt={
                                          getOptionLabel(opt) ||
                                          `Option ${i + 1}`
                                        }
                                        className="w-full h-28 object-cover rounded-lg mb-2"
                                      />
                                    )}
                                    {AUDIO_QUESTION_TYPES.has(qType) ? (
                                      <div onClick={(e) => e.stopPropagation()}>
                                        <TtsOptionButton
                                          text={getOptionLabel(opt)}
                                        />
                                      </div>
                                    ) : (
                                      getOptionLabel(opt)
                                    )}
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : qType === "fill_typing" ||
                        qType === "fill_blank_typing" ? (
                        /* Fill-in-the-blank Typing */
                        <div className="space-y-3">
                          {q.explanation && (
                            <p className="text-sm text-gray-500">
                              {q.explanation}
                            </p>
                          )}
                          <input
                            type="text"
                            value={userAns || ""}
                            onChange={(e) => handleAnswer(qIdx, e.target.value)}
                            disabled={showAnswers}
                            placeholder="Type your answer..."
                            className={`w-full p-3.5 rounded-xl border-2 text-lg font-medium transition-all ${
                              showAnswers
                                ? isCorrect
                                  ? "border-green-500 bg-green-50 text-green-700"
                                  : "border-red-500 bg-red-50 text-red-700"
                                : "border-gray-200 focus:border-[#002856] focus:outline-none"
                            }`}
                          />
                          <UmlautKeyboard
                            onInsert={(char) =>
                              handleAnswer(qIdx, (userAns || "") + char)
                            }
                            disabled={showAnswers}
                          />
                          {showAnswers && !isCorrect && (
                            <p className="text-sm text-gray-600">
                              Correct:{" "}
                              <span className="font-semibold text-green-600">
                                {q.correct || q.correct_answer}
                              </span>
                            </p>
                          )}
                        </div>
                      ) : qType === "fill_options" ||
                        qType === "fill_blank_options" ? (
                        /* Fill-in-the-blank with Options */
                        <div className="space-y-3">
                          {q.explanation && (
                            <p className="text-sm text-gray-500 mb-2">
                              {q.explanation}
                            </p>
                          )}
                          <div className={`flex flex-wrap gap-2`}>
                            {q.options?.map((opt, i) => {
                              const optionValue = getOptionValue(opt);
                              const isSelected = userAns === optionValue;
                              const isCorrectOption =
                                optionValue === q.correct || i === q.correct;
                              let btnClass =
                                "border-gray-200 hover:border-gray-300";

                              if (showAnswers) {
                                if (isCorrectOption)
                                  btnClass =
                                    "border-green-500 bg-green-50 text-green-700";
                                else if (isSelected)
                                  btnClass =
                                    "border-red-500 bg-red-50 text-red-700";
                              } else if (isSelected) {
                                btnClass =
                                  "border-[#002856] bg-[#002856] text-white";
                              }

                              return (
                                <button
                                  key={i}
                                  onClick={() =>
                                    !showAnswers &&
                                    handleAnswer(qIdx, optionValue)
                                  }
                                  disabled={showAnswers}
                                  className={`px-4 py-2 rounded-full border-2 font-medium transition-all ${btnClass}`}
                                >
                                  {getOptionLabel(opt)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : qType === "listen_select_dropdown" ? (
                        /* Standalone Select Dropdown */
                        <div className="space-y-3">
                          {q.explanation && (
                            <p className="text-sm text-gray-500 mb-2">
                              {q.explanation}
                            </p>
                          )}
                          <div className="max-w-md">
                            <CustomDropdown
                              options={
                                q.options?.map((opt) => getOptionLabel(opt)) ||
                                []
                              }
                              value={
                                userAns !== undefined
                                  ? typeof userAns === "number" &&
                                    userAns < q.options.length
                                    ? userAns
                                    : q.options?.findIndex(
                                        (opt) =>
                                          getOptionValue(opt) === userAns,
                                      )
                                  : undefined
                              }
                              onChange={(idx) => {
                                const optionValue = getOptionValue(
                                  q.options[idx],
                                );
                                handleAnswer(qIdx, optionValue);
                              }}
                              disabled={showAnswers}
                              isCorrect={showAnswers && isCorrect}
                              isWrong={
                                showAnswers &&
                                !isCorrect &&
                                userAns !== undefined
                              }
                            />
                            {showAnswers && !isCorrect && (
                              <p className="text-sm text-gray-600 mt-2">
                                Correct:{" "}
                                <span className="font-semibold text-green-600">
                                  {q.correct}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>
                      ) : qType === "sentence_correction" ? (
                        /* Sentence Correction */
                        <div className="space-y-3">
                          <div className="p-4 bg-red-50 rounded-xl border-2 border-red-200">
                            <p className="text-red-800 font-medium">
                              {q.incorrect_sentence ||
                                q.incorrect ||
                                q.sentence}
                            </p>
                          </div>
                          {q.hint_en && (
                            <p className="text-sm text-gray-500">
                              Hint: {q.hint_en}
                            </p>
                          )}
                          <input
                            type="text"
                            value={userAns || ""}
                            onChange={(e) => handleAnswer(qIdx, e.target.value)}
                            disabled={showAnswers}
                            placeholder="Type the corrected sentence..."
                            className={`w-full p-3.5 rounded-xl border-2 text-lg font-medium transition-all ${
                              showAnswers
                                ? isCorrect
                                  ? "border-green-500 bg-green-50 text-green-700"
                                  : "border-red-500 bg-red-50 text-red-700"
                                : "border-gray-200 focus:border-[#002856] focus:outline-none"
                            }`}
                          />
                          <UmlautKeyboard
                            onInsert={(char) =>
                              handleAnswer(qIdx, (userAns || "") + char)
                            }
                            disabled={showAnswers}
                          />
                          {showAnswers && !isCorrect && (
                            <p className="text-sm text-gray-600">
                              Correct:{" "}
                              <span className="font-semibold text-green-600">
                                {q.correct_sentence || q.correct}
                              </span>
                            </p>
                          )}
                        </div>
                      ) : qType === "sentence_ordering" ||
                        qType === "sentence_reorder" ? (
                        /* Sentence Ordering - Drag and Drop */
                        <div>
                          <SentenceOrderingInline
                            question={q}
                            onAnswer={(order) => handleAnswer(qIdx, order)}
                            showResult={showAnswers}
                            isCorrect={isCorrect}
                            userAnswer={userAns}
                          />
                        </div>
                      ) : (
                        /* Default: MCQ Single */
                        <div
                          className={`space-y-2 ${
                            qType === "listen_choose_image"
                              ? "grid grid-cols-1 sm:grid-cols-2 gap-3"
                              : ""
                          }`}
                        >
                          {q.options?.map((opt, i) => {
                            const isSelected = userAns === i;
                            const optionValue = getOptionValue(opt);
                            const optionImage = getOptionImage(opt);
                            const optionAudioUrl = getOptionAudio(opt);
                            const optionLabel = getOptionLabel(opt);
                            const isCorrectOption =
                              optionValue === q.correct || i === q.correct;
                            let btnClass =
                              "border-gray-200 bg-gray-50 hover:border-gray-300";

                            if (showAnswers) {
                              if (isCorrectOption)
                                btnClass =
                                  "border-green-500 bg-green-50 text-green-700";
                              else if (isSelected)
                                btnClass =
                                  "border-red-500 bg-red-50 text-red-700";
                            } else if (isSelected) {
                              btnClass =
                                "border-[#002856] bg-[#edfaff] text-[#002856]";
                            }

                            return (
                              <button
                                key={i}
                                onClick={() =>
                                  !showAnswers && handleAnswer(qIdx, i)
                                }
                                disabled={showAnswers}
                                className={`w-full p-3.5 rounded-xl border-2 text-left font-medium transition-all ${btnClass}`}
                              >
                                <span className="flex items-center gap-3">
                                  <span
                                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                      showAnswers && isCorrectOption
                                        ? "border-green-500 bg-green-500"
                                        : showAnswers && isSelected
                                          ? "border-red-500 bg-red-500"
                                          : isSelected
                                            ? "border-[#002856] bg-[#002856]"
                                            : "border-gray-300"
                                    }`}
                                  >
                                    {(isSelected ||
                                      (showAnswers && isCorrectOption)) && (
                                      <svg
                                        className="w-3 h-3 text-white"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={3}
                                          d="M5 13l4 4L19 7"
                                        />
                                      </svg>
                                    )}
                                  </span>
                                  <span
                                    className={`flex-1 ${
                                      optionAudioUrl ? "flex items-center" : ""
                                    }`}
                                  >
                                    {optionImage && (
                                      <img
                                        src={optionImage}
                                        alt={optionLabel || `Option ${i + 1}`}
                                        className="w-full h-28 object-cover rounded-lg mb-2"
                                      />
                                    )}
                                    {AUDIO_QUESTION_TYPES.has(qType) ? (
                                      <div onClick={(e) => e.stopPropagation()}>
                                        <TtsOptionButton text={optionLabel} />
                                      </div>
                                    ) : (
                                      optionLabel
                                    )}
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Buttons */}
      <div className="p-4">
        {currentItem?.questions?.length > 0 && !showAnswers && (
          <button
            onClick={handleSubmit}
            disabled={
              Object.keys(answers).length <
                (currentItem?.questions?.length || 0) || isSubmitting
            }
            className="w-full py-3 bg-[#002856] text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Checking...
              </>
            ) : (
              "Check Answers"
            )}
          </button>
        )}

        {currentItem?.questions?.length > 0 && showAnswers && (
          <div className="flex gap-3">
            <button
              onClick={handleTryAgain}
              className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold"
            >
              Try Again
            </button>
            <button
              onClick={handleContinue}
              className="flex-1 py-3 bg-[#019035] text-white rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              {currentIndex < content.length - 1 ? "Next" : "Finish"}{" "}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
      <StreakCelebrationModal
        showStreakCelebration={showStreakCelebration}
        setShowStreakCelebration={setShowStreakCelebration}
        streakInfo={streakInfo}
      />
      {!showStreakCelebration &&
        !dailyGoalReached &&
        localStreakCount <= streakInfo.dailyGoal && (
          <FloatingStreakCounter
            current={localStreakCount}
            target={streakInfo.dailyGoal}
            onComplete={handleStreakComplete}
          />
        )}
    </div>
  );
}
