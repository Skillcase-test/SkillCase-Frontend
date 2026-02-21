import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import {
  startExam,
  saveAnswer,
  recordWarning,
  submitExam,
  getTimeRemaining as fetchTimeRemaining,
} from "../../api/examApi";
import {
  Loader2,
  AlertTriangle,
  Clock,
  ChevronDown,
  Send,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  AudioWaveform,
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
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

// CUSTOM DROPDOWN (reused from listening)
const CustomDropdown = ({
  options,
  value,
  onChange,
  disabled,
  placeholder = "Select...",
  showOptionLabels = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const handleInteraction = (event) => {
      if (dropdownRef.current && dropdownRef.current.contains(event.target))
        return;
      setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleInteraction);
      window.addEventListener("scroll", handleInteraction, true);
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
    value !== undefined && value !== null
      ? `${showOptionLabels ? `${toAlphaLabel(value)}. ` : ""}${options[value]}`
      : placeholder;
  let borderClass = isOpen
    ? "border-[#002856] ring-2 ring-[#002856]/10"
    : "border-gray-200";
  if (value !== undefined && value !== null) {
    borderClass = "border-[#002856] bg-[#edfaff]";
  }

  return (
    <div className="relative flex-1 min-w-[140px]" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        disabled={disabled}
        className={`w-full p-3.5 rounded-xl border-2 flex items-center justify-between transition-all text-sm ${borderClass} bg-white text-gray-700 font-medium`}
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
                    e.preventDefault();
                    onChange(idx);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    value === idx
                      ? "bg-[#edfaff] text-[#002856]"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    {showOptionLabels && (
                      <span className="w-6 h-6 rounded-md border border-gray-300 bg-white text-[11px] text-gray-600 font-semibold flex items-center justify-center shrink-0">
                        {toAlphaLabel(idx)}
                      </span>
                    )}
                    <span>{opt}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

function toAlphaLabel(index) {
  let value = index + 1;
  let label = "";
  while (value > 0) {
    const rem = (value - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    value = Math.floor((value - 1) / 26);
  }
  return label;
}

function toBlankPlaceholder(index) {
  const lower = toAlphaLabel(index).toLowerCase();
  return `(${lower})`;
}
function getCompositePrefix(index, mode) {
  if (mode === "none") return "";
  if (mode === "alphabet") return `${toAlphaLabel(index).toLowerCase()}. `;
  return `${index + 1}. `;
}

function extractDriveFileId(url) {
  if (!url) return null;
  try {
    const parsed = new URL(String(url).trim());
    const host = parsed.hostname.toLowerCase();
    if (
      !host.includes("drive.google.com") &&
      !host.includes("drive.usercontent.google.com")
    ) {
      return null;
    }

    const byQuery = parsed.searchParams.get("id");
    if (byQuery) return byQuery;

    const byPath = parsed.pathname.match(/\/file\/d\/([^/]+)/i);
    if (byPath?.[1]) return byPath[1];

    return null;
  } catch {
    return null;
  }
}

function getAudioSourceCandidates(url) {
  if (!url) return [];
  const raw = String(url).trim();
  if (!raw) return [];

  const fileId = extractDriveFileId(raw);
  if (!fileId) return [raw];

  const backendBase = String(import.meta.env.VITE_BACKEND_URL || "").replace(
    /\/$/,
    "",
  );
  const proxyUrl = backendBase
    ? `${backendBase}/exam-audio/proxy?src=${encodeURIComponent(raw)}`
    : "";

  let isDriveViewLink = false;
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    isDriveViewLink =
      host.includes("drive.google.com") && /\/file\/d\/.+\/view/.test(path);
  } catch {
    isDriveViewLink = false;
  }

  const candidates = [
    proxyUrl,
    `https://drive.google.com/uc?export=download&id=${fileId}`,
    `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`,
    `https://drive.google.com/uc?export=open&id=${fileId}`,
  ];

  if (!isDriveViewLink) {
    candidates.unshift(raw);
  }

  return candidates
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index);
}

// DRAGGABLE WORD COMPONENTS
function WordItem({ word, isDragging, isOverlay }) {
  return (
    <div
      className={`px-2 py-2 rounded-xl font-medium text-xs select-none touch-none transition-all ${
        isOverlay
          ? "bg-[#002856] text-white shadow-2xl scale-110 cursor-grabbing z-50"
          : isDragging
          ? "opacity-30 scale-95 bg-gray-200"
          : "bg-white text-[#002856] border-2 border-[#002856] shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md"
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

// MINI AUDIO PLAYER
function QuestionAudioPlayer({ src }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const candidates = useMemo(() => getAudioSourceCandidates(src), [src]);
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [src]);

  const audioSrc = candidates[candidateIndex] || "";

  if (!audioSrc) return null;

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(
      2,
      "0",
    )}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    if (audioRef.current && duration) {
      audioRef.current.currentTime = Math.max(
        0,
        Math.min(duration, ratio * duration),
      );
    }
  };

  const toggle = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    }
  };

  return (
    <div className="w-full bg-[#002856] rounded-2xl p-4 text-white shadow-xl flex items-center gap-4 relative overflow-hidden mb-4">
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#EDB843] opacity-10 rounded-full blur-2xl" />
      <audio
        ref={audioRef}
        src={audioSrc}
        onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setIsPlaying(false);
          if (candidateIndex < candidates.length - 1) {
            setCandidateIndex((idx) => idx + 1);
          }
        }}
      />
      <button
        onClick={toggle}
        className="flex-shrink-0 w-12 h-12 rounded-full bg-[#EDB843] text-[#002856] flex items-center justify-center shadow-lg active:scale-95 transition-all hover:bg-[#F4C75D]"
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 fill-current" />
        ) : (
          <Play className="w-5 h-5 fill-current ml-0.5" />
        )}
      </button>
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        <div className="flex items-center justify-between text-xs font-medium text-white/60 uppercase tracking-wider mb-1">
          <span>Audio</span>
          <span>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
        <div
          className="w-full h-2 flex items-center cursor-pointer gap-[2px] group"
          onClick={handleSeek}
        >
          {Array.from({ length: 40 }).map((_, i) => {
            const isActive = (i / 40) * 100 < progress;
            return (
              <div
                key={i}
                className={`flex-1 h-full rounded-full transition-colors duration-150 ${
                  isActive ? "bg-[#EDB843]" : "bg-white/20"
                }`}
              />
            );
          })}
        </div>
      </div>
      <div className="flex-shrink-0 text-white/40">
        <AudioWaveform className="w-5 h-5" />
      </div>
    </div>
  );
}

// AUDIO BLOCK PLAYER — A2-style with waveform bars + timestamps
function AudioBlockPlayer({ src }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const candidates = useMemo(() => getAudioSourceCandidates(src), [src]);
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [src]);

  const audioSrc = candidates[candidateIndex] || "";

  if (!audioSrc) return null;

  const toggle = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    }
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const p = (e.clientX - rect.left) / rect.width;
    if (audioRef.current && duration) {
      audioRef.current.currentTime = p * duration;
    }
  };

  const fmt = (s) => {
    if (!s || isNaN(s)) return "00:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full bg-[#002856] rounded-2xl p-4 text-white shadow-xl flex items-center gap-4 relative overflow-hidden">
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#EDB843] opacity-10 rounded-full blur-2xl" />
      <audio
        ref={audioRef}
        src={audioSrc}
        onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setIsPlaying(false);
          if (candidateIndex < candidates.length - 1) {
            setCandidateIndex((idx) => idx + 1);
          }
        }}
      />

      <button
        onClick={toggle}
        className="flex-shrink-0 w-12 h-12 rounded-full bg-[#EDB843] text-[#002856] flex items-center justify-center shadow-lg active:scale-95 transition-all hover:bg-[#F4C75D]"
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 fill-current" />
        ) : (
          <Play className="w-5 h-5 fill-current ml-0.5" />
        )}
      </button>

      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        <div className="flex items-center justify-between text-xs font-medium text-white/60 uppercase tracking-wider mb-1">
          <span>Audio</span>
          <span>
            {fmt(currentTime)} / {fmt(duration)}
          </span>
        </div>
        <div
          className="w-full h-2 flex items-center cursor-pointer gap-[2px] group"
          onClick={handleSeek}
        >
          {Array.from({ length: 40 }).map((_, i) => {
            const isActive = (i / 40) * 100 < progress;
            return (
              <div
                key={i}
                className={`flex-1 h-full rounded-full transition-colors duration-150 ${
                  isActive ? "bg-[#EDB843]" : "bg-white/20"
                }`}
              />
            );
          })}
        </div>
      </div>

      <div className="flex-shrink-0 text-white/40">
        <AudioWaveform className="w-5 h-5" />
      </div>
    </div>
  );
}

function AutoGrowTextarea({
  value,
  onChange,
  className,
  minRows = 1,
  ...rest
}) {
  const textareaRef = useRef(null);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => {
        onChange?.(e);
        resize();
      }}
      rows={minRows}
      className={`${className} resize-none overflow-hidden`}
      {...rest}
    />
  );
}

// MAIN EXAM PAGE
export default function ExamPage() {
  const { testId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [submission, setSubmission] = useState(null);
  const [answers, setAnswers] = useState({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [warningCount, setWarningCount] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);
  const [warningMsg, setWarningMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNavDrawer, setShowNavDrawer] = useState(false);
  const [examClosed, setExamClosed] = useState(false);
  const [closedReason, setClosedReason] = useState("");
  const [navbarOffset, setNavbarOffset] = useState(64);

  // Sentence ordering state
  const [orderedWords, setOrderedWords] = useState({});
  const [activeId, setActiveId] = useState(null);
  const [activeWord, setActiveWord] = useState(null);

  const warningCountRef = useRef(0);
  const timerRef = useRef(null);
  const saveTimeoutRef = useRef({});
  const isSubmittingRef = useRef(false);
  const pageContentRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Group questions into pages split by page_break items
  const pages = useMemo(() => {
    const result = [];
    let currentPage = [];
    questions.forEach((q) => {
      if (q.question_type === "page_break") {
        if (currentPage.length > 0) result.push(currentPage);
        currentPage = [];
      } else {
        currentPage.push(q);
      }
    });
    if (currentPage.length > 0) result.push(currentPage);
    // If no page breaks, everything is on one page
    if (result.length === 0 && questions.length > 0) result.push(questions);
    return result;
  }, [questions]);
  const [currentPageIdx, setCurrentPageIdx] = useState(0);

  // ---- INIT: Start exam ----
  useEffect(() => {
    const init = async () => {
      try {
        const res = await startExam(testId);
        const data = res.data;
        setExam(data.exam);
        setQuestions(data.questions);
        setSubmission(data.submission);
        setRemainingSeconds(data.submission.remaining_seconds);
        setWarningCount(data.submission.warning_count);
        warningCountRef.current = data.submission.warning_count;

        // If student already has warnings (e.g. from a reload), show modal immediately
        if (data.submission.warning_count > 0) {
          setWarningMsg(
            `You already have ${data.submission.warning_count}/3 warning(s) on this exam.`,
          );
          setShowWarningModal(true);
        }

        // Restore saved answers
        if (data.savedAnswers) {
          setAnswers(data.savedAnswers);
        }

        // Init sentence ordering states
        const wordStates = {};
        data.questions.forEach((q) => {
          if (
            q.question_type === "sentence_ordering" ||
            q.question_type === "sentence_reorder"
          ) {
            const saved = data.savedAnswers?.[q.question_id];
            if (saved && Array.isArray(saved)) {
              wordStates[q.question_id] = saved;
            } else {
              const words = q.question_data.words || [];
              wordStates[q.question_id] = [...words].sort(
                () => Math.random() - 0.5,
              );
            }
          }
        });
        setOrderedWords(wordStates);
      } catch (err) {
        const msg = err.response?.data?.msg || "Failed to start exam";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [testId]);

  // ---- TIMER ----
  useEffect(() => {
    if (remainingSeconds <= 0 || examClosed) return;

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit("time");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [remainingSeconds > 0, examClosed]);

  // Sync with server every 60s
  useEffect(() => {
    if (examClosed) return;
    const syncInterval = setInterval(async () => {
      try {
        const res = await fetchTimeRemaining(testId);
        if (res.data.is_expired) {
          handleAutoSubmit("time");
        } else {
          setRemainingSeconds(res.data.remaining_seconds);
        }
      } catch (err) {
        console.error("Time sync error:", err);
      }
    }, 60000);
    return () => clearInterval(syncInterval);
  }, [testId, examClosed]);

  // ---- NAVIGATION PREVENTION ----
  useEffect(() => {
    if (examClosed) return;

    // beforeunload
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
      triggerWarning("Attempted to leave the page");
    };

    // visibilitychange (tab switch / app background)
    const handleVisibility = () => {
      if (document.hidden && !isSubmittingRef.current) {
        triggerWarning("Tab/app was switched");
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibility);

    // Capacitor back button
    let backHandler = null;
    if (Capacitor.isNativePlatform()) {
      backHandler = CapApp.addListener("backButton", () => {
        triggerWarning("Back button pressed");
      });
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (backHandler) backHandler.remove();
    };
  }, [examClosed]);

  useEffect(() => {
    const updateNavbarOffset = () => {
      const navEl = document.querySelector("nav");
      if (!navEl) {
        setNavbarOffset(64);
        return;
      }
      const height = navEl.offsetHeight;
      setNavbarOffset(Number.isFinite(height) && height > 0 ? height : 64);
    };

    updateNavbarOffset();
    let resizeObserver;
    const navEl = document.querySelector("nav");
    if (navEl && "ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(updateNavbarOffset);
      resizeObserver.observe(navEl);
    }
    window.addEventListener("resize", updateNavbarOffset);
    return () => {
      window.removeEventListener("resize", updateNavbarOffset);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, []);

  // ---- WARNING HANDLER ----
  const triggerWarning = useCallback(
    async (reason) => {
      if (isSubmittingRef.current || warningCountRef.current >= 3) return;

      try {
        const res = await recordWarning(testId);
        const data = res.data;
        warningCountRef.current = data.warning_count;
        setWarningCount(data.warning_count);

        if (data.closed) {
          handleAutoSubmit("warnings");
        } else {
          setWarningMsg(`Warning ${data.warning_count}/3: ${reason}`);
          setShowWarningModal(true);
        }
      } catch (err) {
        console.error("Warning error:", err);
      }
    },
    [testId],
  );

  // ---- AUTO SUBMIT ----
  const handleAutoSubmit = async (reason) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    clearInterval(timerRef.current);

    try {
      await submitExam(testId);
    } catch (err) {
      console.error("Auto-submit error:", err);
    }

    setExamClosed(true);
    setClosedReason(
      reason === "warnings"
        ? "Your exam was closed due to 3 violations."
        : "Time's up! Your exam has been auto-submitted.",
    );
  };

  // ---- MANUAL SUBMIT ----
  const handleManualSubmit = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      await submitExam(testId);
      setExamClosed(true);
      setClosedReason("submitted");
    } catch (err) {
      console.error("Submit error:", err);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleConfirmSubmit = async () => {
    setShowSubmitConfirmModal(false);
    await handleManualSubmit();
  };

  // ---- SAVE ANSWER (debounced) ----
  const handleAnswer = (questionId, answer) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));

    // Debounce save to server
    if (saveTimeoutRef.current[questionId]) {
      clearTimeout(saveTimeoutRef.current[questionId]);
    }
    saveTimeoutRef.current[questionId] = setTimeout(async () => {
      try {
        const res = await saveAnswer(testId, {
          question_id: questionId,
          answer,
        });
        if (res.data?.expired) {
          handleAutoSubmit("time");
        }
      } catch (err) {
        if (err.response?.data?.expired) handleAutoSubmit("time");
      }
    }, 500);
  };

  // ---- FORMAT TIME ----
  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec
      .toString()
      .padStart(2, "0")}`;
  };

  // ---- LOADING / ERROR / CLOSED STATES ----
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
        <AlertTriangle className="w-16 h-16 text-red-400 mb-4" />
        <p className="text-gray-700 text-lg font-medium mb-4">{error}</p>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-2 bg-[#002856] text-white rounded-xl font-semibold"
        >
          Go Home
        </button>
      </div>
    );
  }

  if (examClosed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-[#002856] flex items-center justify-center mb-6">
          <Send className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-[#002856] mb-2">
          {closedReason === "submitted" ? "Exam Submitted!" : "Exam Closed"}
        </h1>
        <p className="text-gray-500 mb-6">
          {closedReason === "submitted"
            ? "Your answers have been recorded. Results will be available once the admin releases them."
            : closedReason}
        </p>
        <button
          onClick={() => navigate("/")}
          className="px-8 py-3 bg-[#002856] text-white rounded-xl font-semibold"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const currentPage = pages[currentPageIdx] || [];
  const scrollToPageTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  // Count only actual answerable questions (exclude layout/content blocks)
  const answerableQuestions = questions.filter(
    (q) =>
      q.question_type !== "page_break" &&
      q.question_type !== "reading_passage" &&
      q.question_type !== "audio_block" &&
      q.question_type !== "content_block",
  );
  const answeredCount = answerableQuestions.filter(
    (q) =>
      answers[q.question_id] !== undefined && answers[q.question_id] !== null,
  ).length;
  const isUrgent = remainingSeconds < 300; // < 5 min

  // ---- RENDER ----
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="sticky z-40" style={{ top: `${navbarOffset - 10}px` }}>
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNavDrawer(true)}
              className="text-xs font-bold text-[#002856] bg-[#edfaff] px-3 py-1.5 rounded-lg"
            >
              Page {currentPageIdx + 1}/{pages.length}
            </button>
            <span className="text-sm font-medium text-gray-500 hidden sm:block">
              {exam?.title}
            </span>
          </div>
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono font-bold text-sm ${
              isUrgent
                ? "bg-red-50 text-red-600 animate-pulse"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            <Clock className="w-4 h-4" />
            {formatTime(remainingSeconds)}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-gray-200">
          <div
            className="h-full bg-[#002856] transition-all duration-300"
            style={{
              width: `${
                answerableQuestions.length > 0
                  ? (answeredCount / answerableQuestions.length) * 100
                  : 0
              }%`,
            }}
          />
        </div>
      </div>

      {/* Page Content — multiple questions per page */}
      <div ref={pageContentRef} className="p-4 pb-10 max-w-3xl mx-auto w-full">
        <div className="space-y-5 mt-2">
          {(() => {
            return currentPage.map((q, qIdx) => {
              // Audio block — standalone shared audio player (no inheritance)
              if (q.question_type === "audio_block") {
                return (
                  <AudioBlockPlayer key={q.question_id} src={q.audio_url} />
                );
              }
              // Reading passage — render as a styled text block
              if (q.question_type === "reading_passage") {
                return (
                  <div key={q.question_id} className="rounded-xl p-2">
                    <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                      Reading Passage
                    </p>
                    <div
                      className="text-[#181d27] leading-relaxed text-base"
                      style={{
                        color: "#181d27",
                        WebkitTextFillColor: "#181d27",
                      }}
                    >
                      {renderPassageText(
                        q.question_data?.passage || "",
                        "#181d27",
                      )}
                    </div>
                  </div>
                );
              }
              if (q.question_type === "content_block") {
                return (
                  <div
                    key={q.question_id}
                    className="rounded-xl px-3 pt-2 pb-2 bg-gray-50 border border-gray-200 mb-1"
                  >
                    <div
                      className="font-normal leading-relaxed text-base whitespace-pre-wrap break-words break-all"
                      style={{
                        color: "#111827",
                        WebkitTextFillColor: "#111827",
                        opacity: 1,
                      }}
                    >
                      {renderPassageText(
                        q.question_data?.content || "",
                        "#111827",
                      )}
                    </div>
                  </div>
                );
              }
              // Normal question — only use own audio_url, no inheritance
              const answer = answers[q.question_id];
              // Calculate question number (across all answerable questions)
              const globalQNumber =
                answerableQuestions.findIndex(
                  (aq) => aq.question_id === q.question_id,
                ) + 1;
              return (
                <div
                  key={q.question_id}
                  className="bg-white p-1 pb-6 border-b border-gray-200"
                >
                  <p className="text-xs font-semibold text-gray-400 mb-2 mt-2 uppercase tracking-wider">
                    Question {globalQNumber} of {answerableQuestions.length}
                  </p>
                  <QuestionAudioPlayer src={q.audio_url} />
                  <h2
                    className={`text-base font-medium leading-relaxed text-[#181d27] whitespace-pre-wrap break-words ${
                      q.question_type === "composite_question"
                        ? "mb-2.5"
                        : "mb-4"
                    }`}
                  >
                    {q.question_data.question ||
                      (q.question_type === "dialogue_dropdown"
                        ? "Complete the dialogue"
                        : "")}
                  </h2>
                  {renderQuestion(
                    q,
                    answer,
                    handleAnswer,
                    orderedWords,
                    setOrderedWords,
                    sensors,
                    activeId,
                    setActiveId,
                    activeWord,
                    setActiveWord,
                  )}
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t border-gray-200 p-4 flex items-center justify-between sticky bottom-0 z-40">
        <button
          type="button"
          onClick={() => {
            setCurrentPageIdx((i) => Math.max(0, i - 1));
            requestAnimationFrame(scrollToPageTop);
          }}
          disabled={currentPageIdx === 0}
          className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" /> Prev
        </button>
        {currentPageIdx === pages.length - 1 ? (
          <button
            type="button"
            onClick={() => setShowSubmitConfirmModal(true)}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#002856] text-white text-sm font-bold shadow-lg disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Submit
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setCurrentPageIdx((i) => Math.min(pages.length - 1, i + 1));
              requestAnimationFrame(scrollToPageTop);
            }}
            className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-[#002856] text-white text-sm font-semibold"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Question Navigation Drawer */}
      {showNavDrawer && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowNavDrawer(false)}
          />
          <div className="relative bg-white w-72 max-w-[80vw] h-full p-6 shadow-xl overflow-y-auto">
            <h3 className="text-lg font-bold text-[#002856] mb-4">Pages</h3>
            <div className="space-y-3">
              {pages.map((page, pageIdx) => {
                const pageAnswerable = page.filter(
                  (q) =>
                    q.question_type !== "reading_passage" &&
                    q.question_type !== "audio_block" &&
                    q.question_type !== "content_block" &&
                    q.question_type !== "page_break",
                );
                const pageAnswered = pageAnswerable.filter(
                  (q) =>
                    answers[q.question_id] !== undefined &&
                    answers[q.question_id] !== null,
                ).length;
                const isCurrent = pageIdx === currentPageIdx;
                const allAnswered =
                  pageAnswerable.length > 0 &&
                  pageAnswered === pageAnswerable.length;
                return (
                  <button
                    key={pageIdx}
                    onClick={() => {
                      setCurrentPageIdx(pageIdx);
                      setShowNavDrawer(false);
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      isCurrent
                        ? "bg-[#002856] text-white"
                        : allAnswered
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-gray-50 text-gray-600 border border-gray-200"
                    }`}
                  >
                    <span className="font-bold text-sm">
                      Page {pageIdx + 1}
                    </span>
                    <span
                      className={`text-xs ml-2 ${
                        isCurrent ? "text-white/70" : "text-gray-400"
                      }`}
                    >
                      {pageAnswered}/{pageAnswerable.length} answered
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-6 space-y-2 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-50 border border-green-200" />{" "}
                All answered
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-50 border border-gray-200" />{" "}
                Incomplete
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[#002856]" /> Current page
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-red-700">Warning!</h3>
                <p className="text-sm text-gray-500">{warningMsg}</p>
              </div>
            </div>
            <div className="flex gap-2 mb-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`flex-1 h-2 rounded-full ${
                    i <= warningCount ? "bg-red-500" : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {3 - warningCount} warning(s) remaining. Your exam will be closed
              after 3 violations.
            </p>
            <button
              type="button"
              onClick={() => setShowWarningModal(false)}
              className="w-full py-3 bg-[#002856] text-white rounded-xl font-semibold"
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      {/* Submit Confirm Modal */}
      {showSubmitConfirmModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-2xl w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#edfaff] flex items-center justify-center">
                <Send className="w-6 h-6 text-[#002856]" />
              </div>
              <div>
                <h3 className="font-bold text-[#002856]">Confirm Submit</h3>
                <p className="text-sm text-gray-500">
                  Are you sure you want to submit?
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitConfirmModal(false)}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-[#153A71] text-white rounded-xl font-semibold disabled:opacity-50"
              >
                No
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-[#002856] text-white rounded-xl font-semibold disabled:opacity-50"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// PASSAGE TEXT RENDERER (bold, italic, underline, line breaks)
function renderPassageText(text, textColor = "#111827") {
  if (!text) return null;
  const parts = [];
  const segmentStyle = {
    color: textColor,
    WebkitTextFillColor: textColor,
    opacity: 1,
  };
  const lines = text.split("\n");
  lines.forEach((line, lineIdx) => {
    if (lineIdx > 0) parts.push(<br key={`br-${lineIdx}`} />);
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|__(.+?)__)/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span
            key={`t-${lineIdx}-${lastIndex}`}
            style={segmentStyle}
            className="text-inherit"
          >
            {line.slice(lastIndex, match.index)}
          </span>,
        );
      }
      if (match[2]) {
        parts.push(
          <strong
            key={`b-${lineIdx}-${match.index}`}
            style={segmentStyle}
            className="text-inherit font-semibold"
          >
            {match[2]}
          </strong>,
        );
      } else if (match[3]) {
        parts.push(
          <em
            key={`i-${lineIdx}-${match.index}`}
            style={segmentStyle}
            className="text-inherit"
          >
            {match[3]}
          </em>,
        );
      } else if (match[4]) {
        parts.push(
          <u
            key={`u-${lineIdx}-${match.index}`}
            style={segmentStyle}
            className="text-inherit"
          >
            {match[4]}
          </u>,
        );
      }
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < line.length) {
      parts.push(
        <span
          key={`t-${lineIdx}-${lastIndex}-end`}
          style={segmentStyle}
          className="text-inherit"
        >
          {line.slice(lastIndex)}
        </span>,
      );
    }
  });
  return parts;
}

// QUESTION RENDERER FUNCTION
function renderQuestion(
  q,
  answer,
  handleAnswer,
  orderedWords,
  setOrderedWords,
  sensors,
  activeId,
  setActiveId,
  activeWord,
  setActiveWord,
) {
  const qId = q.question_id;
  const qType = q.question_type;
  const qData = q.question_data;

  switch (qType) {
    case "mcq_single":
    case "mcq":
      return (
        <div className="space-y-2">
          {qData.options?.map((opt, i) => {
            const isSelected = answer === i;
            return (
              <button
                key={i}
                onClick={() => handleAnswer(qId, i)}
                className={`w-full p-3.5 rounded-xl border-2 text-left text-base font-medium transition-all ${
                  isSelected
                    ? "border-[#002856] bg-[#edfaff] text-[#002856]"
                    : "border-gray-200 bg-gray-50 hover:border-gray-300"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`w-7 h-7 rounded-md border flex items-center justify-center text-[11px] font-semibold ${
                      isSelected
                        ? "border-[#002856] bg-[#002856] text-white"
                        : "border-gray-300 bg-white text-gray-600"
                    }`}
                  >
                    {toAlphaLabel(i)}
                  </span>
                  <span className="break-words break-all">{opt}</span>
                </span>
              </button>
            );
          })}
        </div>
      );

    case "mcq_multi":
      return (
        <div className="space-y-2">
          <p className="text-sm text-gray-500 mb-2">Select all that apply</p>
          {qData.options?.map((opt, i) => {
            const userArr = Array.isArray(answer) ? answer : [];
            const isSelected = userArr.includes(i);
            return (
              <button
                key={i}
                onClick={() => {
                  const current = Array.isArray(answer) ? [...answer] : [];
                  const idx = current.indexOf(i);
                  if (idx > -1) current.splice(idx, 1);
                  else current.push(i);
                  handleAnswer(qId, current);
                }}
                className={`w-full p-3.5 rounded-xl border-2 text-left text-base font-medium transition-all ${
                  isSelected
                    ? "border-[#002856] bg-[#edfaff] text-[#002856]"
                    : "border-gray-200 bg-gray-50 hover:border-gray-300"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`w-7 h-7 rounded-md border flex items-center justify-center text-[11px] font-semibold ${
                      isSelected
                        ? "border-[#002856] bg-[#002856] text-white"
                        : "border-gray-300 bg-white text-gray-600"
                    }`}
                  >
                    {toAlphaLabel(i)}
                  </span>
                  <span className="break-words break-all">{opt}</span>
                </span>
              </button>
            );
          })}
        </div>
      );

    case "true_false":
    case "truefalse":
      return (
        <div className="space-y-2">
          {[true, false].map((val, idx) => {
            const isSelected = answer === val;
            return (
              <button
                key={String(val)}
                onClick={() => handleAnswer(qId, val)}
                className={`w-full p-3.5 rounded-xl border-2 text-left text-base font-medium transition-all ${
                  isSelected
                    ? "border-[#002856] bg-[#edfaff] text-[#002856]"
                    : "border-gray-200 bg-gray-50 hover:border-gray-300"
                }`}
              >
                <span className="inline-flex items-center gap-3">
                  <span
                    className={`w-7 h-7 rounded-md border flex items-center justify-center text-[11px] font-semibold ${
                      isSelected
                        ? "border-[#002856] bg-[#002856] text-white"
                        : "border-gray-300 bg-white text-gray-600"
                    }`}
                  >
                    {toAlphaLabel(idx)}
                  </span>
                  <span>{val ? "True" : "False"}</span>
                </span>
              </button>
            );
          })}
        </div>
      );

    case "fill_typing":
    case "fill_blank_typing":
      return (
        <div className="space-y-3">
          {qData.explanation && (
            <p className="text-sm text-gray-500">{qData.explanation}</p>
          )}
          <AutoGrowTextarea
            value={answer || ""}
            onChange={(e) => handleAnswer(qId, e.target.value)}
            placeholder={qData.placeholder || "Type your answer"}
            className="w-full p-3.5 rounded-xl border-2 border-gray-200 text-base font-medium leading-relaxed whitespace-pre-wrap break-words break-all placeholder:text-base placeholder:font-medium placeholder:leading-relaxed placeholder:text-gray-400 focus:border-[#002856] focus:outline-none transition-all"
            minRows={1}
          />
        </div>
      );

    case "fill_options":
    case "fill_blank_options":
      return (
        <div className="space-y-3">
          {qData.explanation && (
            <p className="text-sm text-gray-500 mb-2">{qData.explanation}</p>
          )}
          <div className="space-y-2">
            {qData.options?.map((opt, i) => {
              const isSelected = answer === opt;
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(qId, opt)}
                  className={`w-full p-3.5 rounded-xl border-2 text-left text-base font-medium transition-all ${
                    isSelected
                      ? "border-[#002856] bg-[#edfaff] text-[#002856]"
                      : "border-gray-200 bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  <span className="inline-flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-md border flex items-center justify-center text-[11px] font-semibold ${
                        isSelected
                          ? "border-[#002856] bg-[#002856] text-white"
                          : "border-gray-300 bg-white text-gray-600"
                      }`}
                    >
                      {toAlphaLabel(i)}
                    </span>
                    <span className="break-words break-all">{opt}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      );

    case "composite_question": {
      const items = Array.isArray(qData.items) ? qData.items : [];
      const userAnswers = answer && typeof answer === "object" ? answer : {};

      return (
        <div className="space-y-3">
          {qData.intro_text && (
            <div className="text-base text-gray-700 whitespace-pre-wrap break-words break-all">
              {qData.intro_text}
            </div>
          )}

          {items.map((item, idx) => {
            const itemType =
              item?.type === "option"
                ? "option"
                : item?.type === "dropdown"
                ? "dropdown"
                : "blank";
            const itemAnswer = userAnswers[idx] ?? userAnswers[String(idx)];
            const expectedBlankCount = Number.isInteger(item?.blank_count)
              ? Math.max(1, item.blank_count)
              : Array.isArray(item?.correct)
              ? Math.max(1, item.correct.length)
              : 1;
            const blankCorrects = Array.from({ length: expectedBlankCount });
            const blankAnswers = Array.isArray(itemAnswer)
              ? itemAnswer
              : [itemAnswer ?? ""];
            const numberingStyle = qData.numbering_style || "number";
            const prefix = getCompositePrefix(idx, numberingStyle);

            return (
              <div
                key={idx}
                className="py-2.5 space-y-2.5 border-b border-gray-100 last:border-b-0"
              >
                <p className="text-base font-medium text-gray-700 whitespace-pre-wrap break-words">
                  {prefix}
                  {item?.prompt || "Sub question"}
                </p>

                {itemType === "option" ? (
                  <div className="space-y-2">
                    {(item.options || []).map((opt, optIdx) => {
                      const isSelected = Number(itemAnswer) === optIdx;
                      return (
                        <button
                          key={optIdx}
                          onClick={() =>
                            handleAnswer(qId, {
                              ...userAnswers,
                              [idx]: optIdx,
                            })
                          }
                          className={`w-full p-3.5 rounded-xl border-2 text-left text-base font-medium transition-all ${
                            isSelected
                              ? "border-[#002856] bg-[#edfaff] text-[#002856]"
                              : "border-gray-200 bg-gray-50 hover:border-gray-300"
                          }`}
                        >
                          <span className="inline-flex items-center gap-3">
                            <span
                              className={`w-7 h-7 rounded-md border flex items-center justify-center text-[11px] font-semibold ${
                                isSelected
                                  ? "border-[#002856] bg-[#002856] text-white"
                                  : "border-gray-300 bg-white text-gray-600"
                              }`}
                            >
                              {toAlphaLabel(optIdx)}
                            </span>
                            <span className="break-words break-all">{opt}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : itemType === "dropdown" ? (
                  <div>
                    <CustomDropdown
                      options={item.options || []}
                      value={
                        typeof itemAnswer === "number" ? itemAnswer : undefined
                      }
                      onChange={(val) =>
                        handleAnswer(qId, {
                          ...userAnswers,
                          [idx]: val,
                        })
                      }
                      placeholder="Select answer..."
                      showOptionLabels={true}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {blankCorrects.map((_, blankIdx) => (
                      <AutoGrowTextarea
                        key={blankIdx}
                        value={blankAnswers[blankIdx] || ""}
                        onChange={(e) => {
                          const nextAnswers = [...blankAnswers];
                          nextAnswers[blankIdx] = e.target.value;
                          handleAnswer(qId, {
                            ...userAnswers,
                            [idx]: nextAnswers,
                          });
                        }}
                        placeholder={
                          (Array.isArray(item?.placeholders)
                            ? item.placeholders[blankIdx]
                            : "") || "Type your answer"
                        }
                        className="w-full p-3.5 rounded-xl border-2 border-gray-200 text-base font-medium leading-relaxed whitespace-pre-wrap break-words break-all placeholder:text-base placeholder:font-medium placeholder:leading-relaxed placeholder:text-gray-400 focus:border-[#002856] focus:outline-none transition-all"
                        minRows={1}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    case "sentence_ordering":
    case "sentence_reorder": {
      const words = orderedWords[qId] || [];
      const customCollision = (args) => {
        const pointer = pointerWithin(args);
        if (pointer.length > 0) return pointer;
        const rect = rectIntersection(args);
        if (rect.length > 0) return rect;
        return closestCenter(args);
      };

      return (
        <div className="space-y-4">
          {qData.hint_en && (
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-sm font-medium text-blue-800">
                <span className="text-blue-600">Hint: </span>"{qData.hint_en}"
              </p>
            </div>
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={customCollision}
            onDragStart={(e) => {
              setActiveId(e.active.id);
              setActiveWord(words.find((w) => w === e.active.id));
            }}
            onDragEnd={(e) => {
              const { active, over } = e;
              setActiveId(null);
              setActiveWord(null);
              if (active.id !== over?.id && over) {
                const oldIdx = words.indexOf(active.id);
                const newIdx = words.indexOf(over.id);
                const newOrder = arrayMove(words, oldIdx, newIdx);
                setOrderedWords((prev) => ({ ...prev, [qId]: newOrder }));
                setTimeout(() => handleAnswer(qId, newOrder), 0);
              }
            }}
          >
            <SortableContext
              items={words}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex flex-wrap gap-2.5 p-3.5 rounded-xl min-h-[72px] border-2 border-dashed border-gray-300 bg-grey-50">
                {words.map((word) => (
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
        </div>
      );
    }

    case "sentence_correction":
      return (
        <div className="space-y-3">
          <div className="p-4 bg-red-50 rounded-xl border-2 border-red-200">
            <p className="text-red-800 font-medium">
              {qData.incorrect_sentence || qData.incorrect || qData.sentence}
            </p>
          </div>
          {qData.hint_en && (
            <p className="text-sm text-gray-500">Hint: {qData.hint_en}</p>
          )}
          <textarea
            value={answer || ""}
            onChange={(e) => handleAnswer(qId, e.target.value)}
            placeholder="Type the corrected sentence..."
            className="w-full p-3.5 rounded-xl border-2 border-gray-200 text-base font-medium leading-relaxed whitespace-pre-wrap break-words break-all placeholder:text-base placeholder:font-medium placeholder:leading-relaxed placeholder:text-gray-400 focus:border-[#002856] focus:outline-none transition-all"
            rows={3}
          />
        </div>
      );

    case "matching":
      return (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 mb-2">
            Match items from left to right
          </p>
          {qData.left?.map((leftItem, leftIdx) => {
            const userPairs = Array.isArray(answer) ? answer : [];
            const selectedRight = userPairs.find((p) => p[0] === leftIdx)?.[1];
            return (
              <div key={leftIdx} className="flex items-center gap-3">
                <span className="flex-1 p-3 bg-[#edfaff] rounded-xl text-sm font-medium text-[#002856] border border-[#002856]/20">
                  {leftItem}
                </span>
                <span className="text-gray-400">→</span>
                <div className="flex-1">
                  <CustomDropdown
                    options={qData.right || []}
                    value={selectedRight}
                    onChange={(rightIdx) => {
                      const current = Array.isArray(answer)
                        ? answer.filter((p) => p[0] !== leftIdx)
                        : [];
                      current.push([leftIdx, rightIdx]);
                      handleAnswer(qId, current);
                    }}
                    placeholder="Match..."
                  />
                </div>
              </div>
            );
          })}
        </div>
      );

    case "dialogue_dropdown":
      return (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-4">
          {qData.dialogue?.map((line, lineIdx) => {
            const lineAnswer = answer?.[lineIdx];
            const hasOptions = line.options && line.text === null;
            return (
              <div key={lineIdx} className="flex items-start gap-2">
                <span className="font-semibold text-gray-700 w-14 text-right shrink-0 mt-3.5">
                  {line.speaker}:
                </span>
                {hasOptions ? (
                  <CustomDropdown
                    options={line.options}
                    value={lineAnswer}
                    onChange={(val) => {
                      const newAns = { ...(answer || {}), [lineIdx]: val };
                      handleAnswer(qId, newAns);
                    }}
                    placeholder="Select response..."
                    showOptionLabels={true}
                  />
                ) : (
                  <span className="text-gray-600 flex-1 py-3">{line.text}</span>
                )}
              </div>
            );
          })}
        </div>
      );

    default:
      return <p className="text-gray-500">Unknown question type: {qType}</p>;
  }
}
