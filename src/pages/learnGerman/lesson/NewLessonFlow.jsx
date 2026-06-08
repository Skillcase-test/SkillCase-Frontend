import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { AnimatePresence, LayoutGroup } from "framer-motion";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import api from "../../../api/axios";
import { getLessonById, getLessonsList } from "../../../api/learnGermanApi";
import { hapticLight, hapticMedium, hapticHeavy } from "../../../utils/haptics";
import { setClarityTag, trackClarityEvent } from "../../../observability/clarity";
import { preloadMayaTTSText } from "./screens/shared/useMayaTTS";
import {
  getGermanTTSBlob,
  preloadGermanTTSText,
  preloadLessonTTS,
} from "./ttsCache";
import {
  getLgGuideStage,
  LG_GUIDE_STAGES,
  setLgGuideStage,
} from "../lgFirstTimeGuide";

// Screen Components
import IntroScreen from "./screens/IntroScreen";
import LessonScenarioScreen from "./screens/LessonScenarioScreen";
import VocabScreen from "./screens/VocabScreen";
import QuizScreen from "./screens/QuizScreen";
import MatchFollowingScreen from "./screens/MatchFollowingScreen";
import MatchImageScreen from "./screens/MatchImageScreen";
import ListenAndChooseScreen from "./screens/ListenAndChooseScreen";
import UnjumbleScreen from "./screens/UnjumbleScreen";
import ConversationScreen from "./screens/ConversationScreen";
import ConversationIntroScreen from "./screens/ConversationIntroScreen";
import OutroScreen from "./screens/OutroScreen";
import GrammarScreen from "./screens/GrammarScreen";
import ProgressBar, {
  ProgressBarHostProvider,
} from "./screens/shared/ProgressBar";

// Modals
import QuizResultModal from "./screens/shared/QuizResultModal";
import LevelCompleteModal from "./screens/LevelCompleteModal";
import LeaveLessonModal from "./screens/shared/LeaveLessonModal";

const TapGuideOverlay = ({ rect, onClick }) => {
  const padding = 6;
  const top = Math.max(0, rect.top - padding);
  const left = Math.max(0, rect.left - padding);
  const width = rect.width + padding * 2;
  const height = rect.height + padding * 2;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const calloutWidth = Math.min(260, viewportWidth - 32);
  const preferBelow = top + height + 92 <= viewportHeight;
  const calloutTop = preferBelow
    ? top + height + 16
    : Math.max(16, top - 98);
  const calloutLeft = Math.min(
    Math.max(16, left + width / 2 - calloutWidth / 2),
    viewportWidth - calloutWidth - 16,
  );
  const blurPanelClass = "absolute bg-slate-950/50 backdrop-blur-[5px]";

  return (
    <div className="fixed inset-0 z-[300]">
      <div className={blurPanelClass} style={{ left: 0, top: 0, right: 0, height: top }} />
      <div className={blurPanelClass} style={{ left: 0, top, width: left, height }} />
      <div
        className={blurPanelClass}
        style={{ left: left + width, top, right: 0, height }}
      />
      <div
        className={blurPanelClass}
        style={{ left: 0, top: top + height, right: 0, bottom: 0 }}
      />

      <button
        type="button"
        onClick={onClick}
        className="absolute rounded-xl bg-white/10"
        style={{ top, left, width, height }}
      >
        <span className="absolute inset-0 rounded-xl border-[3px] border-white shadow-[0_0_0_1px_rgba(255,255,255,0.75),0_14px_38px_rgba(0,0,0,0.32)]" />
        <span className="absolute inset-0 rounded-xl border-2 border-white/90 animate-ping" />
      </button>

      <div
        className="absolute z-[301] rounded-[22px] bg-white px-4 py-3 shadow-[0_20px_45px_rgba(15,23,42,0.28)] border border-white/80"
        style={{ top: calloutTop, left: calloutLeft, width: calloutWidth }}
      >
        <div
          className={`absolute right-6 h-4 w-4 rotate-45 bg-white ${
            preferBelow ? "-top-2" : "-bottom-2"
          }`}
        />
        <p className="relative text-[14px] text-slate-950 font-bold leading-snug">
          Tap the Continue button to continue.
        </p>
        <p className="relative mt-1 text-[12px] text-slate-500 font-medium leading-snug">
          When you see this button, it means the screen is ready for your tap.
        </p>
      </div>
    </div>
  );
};

export default function NewLessonFlow() {
  const navigate = useNavigate();
  // :chapterId is the numeric lesson_id from the dynamic lessons table
  const { chapterId } = useParams();
  const [searchParams] = useSearchParams();
  // review mode: skip straight to the outro so the user replays the completion sequence
  const isReviewMode = searchParams.get("mode") === "review";

  // ---- Core lesson state ----
  const [lessonData, setLessonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [screenIndex, setScreenIndex] = useState(0);
  const [levelComplete, setLevelComplete] = useState(false);
  const [completionDialogue, setCompletionDialogue] = useState("");
  const [nextLessonId, setNextLessonId] = useState(null);
  const [streakUpdated, setStreakUpdated] = useState(false);
  const [coinsAwarded, setCoinsAwarded] = useState(20);
  const [answeredScreenMap, setAnsweredScreenMap] = useState({});
  const [showConversationCompletedFallback, setShowConversationCompletedFallback] =
    useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentlySpeakingText, setCurrentlySpeakingText] = useState("");
  const currentSpeakAudioRef = useRef(null);
  // Cache for German TTS blobs keyed by text — avoids repeat API calls
  const currentSpeakObjectUrlRef = useRef(null);
  const lastPersistedScreenRef = useRef(0);
  const completionPersistPromiseRef = useRef(null);
  const completionResultRef = useRef({
    streakUpdated: false,
    coinsAwarded: 20,
  });
  const tapGuideDelayTimerRef = useRef(null);

  const [conversationSelections, setConversationSelections] = useState({});
  const [solvedOptionSelections, setSolvedOptionSelections] = useState({});
  const [solvedMatchFollowingMap, setSolvedMatchFollowingMap] = useState({});
  const [solvedDragScreensMap, setSolvedDragScreensMap] = useState({});
  const [conversationResumeIndex, setConversationResumeIndex] = useState(null);

  // ---- MCQ quiz state ----
  const [selectedOption, setSelectedOption] = useState(null);
  const [quizState, setQuizState] = useState("idle");

  // ---- Match-the-following state ----
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [selectedRight, setSelectedRight] = useState(null);
  const [wrongPair, setWrongPair] = useState(null);
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [recentMatch, setRecentMatch] = useState(null);

  // ---- Leave Lesson Modal State ----
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // ---- Drag & Drop shared state ----
  const [placedItems, setPlacedItems] = useState({});
  const [activeDragItem, setActiveDragItem] = useState(null);
  const [dragQuizState, setDragQuizState] = useState("idle");
  const [slotStatuses, setSlotStatuses] = useState({});
  const [showTapGuide, setShowTapGuide] = useState(false);
  const [tapGuidePending, setTapGuidePending] = useState(false);
  const [tapGuideTargetRect, setTapGuideTargetRect] = useState(null);
  const [guidedScenarioTapNonce, setGuidedScenarioTapNonce] = useState(0);

  // ---- DnD sensors ----
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  );

  useEffect(() => {
    return () => {
      if (tapGuideDelayTimerRef.current) {
        window.clearTimeout(tapGuideDelayTimerRef.current);
      }
      if (currentSpeakAudioRef.current) {
        currentSpeakAudioRef.current.pause();
        currentSpeakAudioRef.current.src = "";
        currentSpeakAudioRef.current = null;
      }
      if (currentSpeakObjectUrlRef.current) {
        URL.revokeObjectURL(currentSpeakObjectUrlRef.current);
        currentSpeakObjectUrlRef.current = null;
      }
    };
  }, []);

  const getCompletionDialogue = useCallback((lesson, outroScreen) => {
    const outroDialogues = Array.isArray(outroScreen?.dialogues)
      ? outroScreen.dialogues
      : [];
    return (
      outroScreen?.completionDialogue ||
      outroScreen?.dialogue ||
      outroDialogues[outroDialogues.length - 1] ||
      lesson?.completionDialogue ||
      lesson?.outroDialogue ||
      "Awesome! Now you can talk to the baker in German."
    );
  }, []);

  // Fetch lesson by its numeric ID (the chapterId route param)
  useEffect(() => {
    if (!chapterId) return;

    // Reset lesson state on route change
    setScreenIndex(0);
    setLevelComplete(false);
    setQuizState("idle");
    setDragQuizState("idle");
    setSelectedOption(null);
    setPlacedItems({});
    setSlotStatuses({});
    setMatchedPairs([]);
    setSelectedLeft(null);
    setSelectedRight(null);
    setWrongPair(null);
    setNextLessonId(null);
    setCoinsAwarded(20);
    setAnsweredScreenMap({});
    setShowConversationCompletedFallback(false);
    setError(null);
    setLoading(true);
    setConversationSelections({});
    setSolvedOptionSelections({});
    setSolvedMatchFollowingMap({});
    setSolvedDragScreensMap({});
    setConversationResumeIndex(null);
    setShowTapGuide(false);
    setTapGuidePending(false);
    setGuidedScenarioTapNonce(0);
    lastPersistedScreenRef.current = 0;
    completionPersistPromiseRef.current = null;
    completionResultRef.current = {
      streakUpdated: false,
      coinsAwarded: 20,
    };
    if (tapGuideDelayTimerRef.current) {
      window.clearTimeout(tapGuideDelayTimerRef.current);
      tapGuideDelayTimerRef.current = null;
    }

    const fetchLesson = async () => {
      try {
        const { data } = await getLessonById(chapterId);
        setLessonData(data);
        setClarityTag("lg_funnel", "lesson");
        setClarityTag("lg_lesson_id", chapterId);
        setClarityTag("lg_lesson_title", data.title || "unknown");
        trackClarityEvent("lg_lesson_opened", {
          lg_funnel: "lesson",
          lg_lesson_id: chapterId,
          lg_lesson_title: data.title || "unknown",
          lg_lesson_status: data.user_status || "unknown",
          lg_lesson_level: data.proficiency_level || "unknown",
          lg_review_mode: isReviewMode,
        }, "lg_lesson_opened");
        preloadLessonTTS(data.screens || [], 0);

        // In review mode, jump directly to the outro screen so the user sees
        // the completion sequence again without replaying the whole lesson
        if (isReviewMode && data.screens?.length > 0) {
          const outroIdx = data.screens.findIndex((s) => s.type === "outro");
          const startIdx =
            outroIdx > 0 ? outroIdx - 1 : data.screens.length - 1;
          setScreenIndex(startIdx);
          setCompletionDialogue(
            getCompletionDialogue(
              data,
              outroIdx !== -1 ? data.screens[outroIdx] : null,
            ),
          );
          setLevelComplete(true);
          return;
        }

        // Restore saved progress if lesson is in_progress (not completed, not fresh)
        const savedScreen = Number(data.user_screens_completed || 0);
        lastPersistedScreenRef.current = savedScreen;
        preloadLessonTTS(data.screens || [], savedScreen);
        const totalScreens = data.screens?.length || 0;
        if (
          data.user_status === "in_progress" &&
          savedScreen > 0 &&
          savedScreen < totalScreens
        ) {
          setScreenIndex(savedScreen);
          const restoredAnswered = {};
          for (let i = 0; i < savedScreen; i += 1) {
            restoredAnswered[i] = true;
          }
          setAnsweredScreenMap(restoredAnswered);
          // Initialise drag state for the restored screen if needed
          const restoredScreen = data.screens[savedScreen];
          if (
            restoredScreen?.type === "match_image" ||
            restoredScreen?.type === "unjumble"
          ) {
            const initPlaced = {};
            (restoredScreen.slots || []).forEach((slot) => {
              initPlaced[slot.id] = null;
            });
            setPlacedItems(initPlaced);
          }
          return;
        }

        // Normal mode: initialise drag state for the first screen if needed
        const firstScreen = data.screens?.[0];
        if (
          firstScreen?.type === "match_image" ||
          firstScreen?.type === "unjumble"
        ) {
          const initPlaced = {};
          (firstScreen.slots || []).forEach((slot) => {
            initPlaced[slot.id] = null;
          });
          setPlacedItems(initPlaced);
        }
      } catch (err) {
        if (err?.response?.status === 409) {
          setError(
            err.response?.data?.error || "This topic is not available yet.",
          );
        } else {
          setError("Failed to load lesson configuration.");
        }
      } finally {
        setLoading(false);
      }

      try {
        const listRes = await getLessonsList();
        const modules = Array.isArray(listRes.data) ? listRes.data : [];
        // find current lesson
        const currentIndex = modules.findIndex(
          (m) => String(m.lesson_id) === String(chapterId),
        );
        if (currentIndex !== -1 && currentIndex < modules.length - 1) {
          // find next lesson with has_content
          for (let i = currentIndex + 1; i < modules.length; i++) {
            if (modules[i].has_content) {
              setNextLessonId(modules[i].lesson_id);
              break;
            }
          }
        }
      } catch (err) {
        console.error(
          "Failed to fetch lesson list for next lesson calculation",
          err,
        );
      }
    };

    fetchLesson();
  }, [chapterId, getCompletionDialogue, isReviewMode]);

  // Preload audio for the next 2 screens whenever screenIndex changes.
  // This primes both the Maya TTS cache and the German TTS cache so playback
  // is instant when those screens are actually reached.
  useEffect(() => {
    if (!lessonData?.screens) return;
    const screens = lessonData.screens;

    [screenIndex + 1, screenIndex + 2].forEach((i) => {
      const s = screens[i];
      if (!s) return;

      // Maya dialogue preload
      const introDialogues =
        s.type === "conversation_intro" && Array.isArray(s.dialogues)
          ? s.dialogues
          : [];
      const mayaText =
        introDialogues[0] ||
        s.mayaDialogue ||
        s.dialogue ||
        s.characterDialogue;
      if (mayaText) preloadMayaTTSText(mayaText);

      // German vocab/question preload
      const germanText = s.audioText || s.word || s.question || s.audioScript;
      if (germanText) preloadGermanTTSText(germanText);
    });
  }, [screenIndex, lessonData?.screens]);

  // ---------------------------------------------------------------------------
  // Progress persistence
  // ---------------------------------------------------------------------------

  // Save partial progress whenever the user advances a screen
  const persistProgress = useCallback(
    async (screensCompleted) => {
      if (!chapterId) return;
      const nextSavedScreen = Number(screensCompleted);
      if (
        !Number.isFinite(nextSavedScreen) ||
        nextSavedScreen <= lastPersistedScreenRef.current
      ) {
        return;
      }
      lastPersistedScreenRef.current = nextSavedScreen;
      try {
        await api.post("/dynamic-lesson/progress", {
          lessonId: chapterId,
          screensCompleted: nextSavedScreen,
        });
        api.clearGetCache?.();
      } catch (err) {
        // Non-blocking — progress save failures should not interrupt the lesson
        console.error("Failed to save progress:", err);
      }
    },
    [chapterId],
  );

  // Mark lesson fully complete — fires when the level-complete modal opens
  const persistComplete = useCallback(async () => {
    if (!chapterId) return completionResultRef.current;
    if (completionPersistPromiseRef.current) {
      return completionPersistPromiseRef.current;
    }

    completionPersistPromiseRef.current = api
      .post("/dynamic-lesson/complete", { lessonId: chapterId })
      .then(({ data }) => {
        api.clearGetCache?.();
        const result = {
          // streakUpdated = true means this was the first lesson completed today
          streakUpdated: data?.streakUpdated === true,
          coinsAwarded: Number.isFinite(Number(data?.coinsAwarded))
            ? Number(data.coinsAwarded)
            : 0,
        };
        completionResultRef.current = result;
        setStreakUpdated(result.streakUpdated);
        setCoinsAwarded(result.coinsAwarded);
        trackClarityEvent("lg_lesson_completed", {
          lg_funnel: "lesson",
          lg_lesson_id: chapterId,
          lg_lesson_title: lessonData?.title || "unknown",
          lg_lesson_level: lessonData?.proficiency_level || "unknown",
          lg_coins_awarded: result.coinsAwarded,
          lg_streak_updated: result.streakUpdated,
        }, "lg_lesson_completed");
        // Notify Navbar to re-fetch progress ring + coins immediately
        window.dispatchEvent(new CustomEvent("lgLessonComplete"));
        return result;
      })
      .catch((err) => {
        completionPersistPromiseRef.current = null;
        console.error("Failed to mark lesson complete:", err);
        return completionResultRef.current;
      });

    return completionPersistPromiseRef.current;
  }, [chapterId, lessonData?.proficiency_level, lessonData?.title]);

  const navigateToLearnGermanHome = useCallback(async ({ autoStartNext = false } = {}) => {
    const completionResult = await persistComplete();
    const vocabCount = (lessonData?.screens || []).filter((s) => s.type === "vocab").length;
    navigate("/learn-german", {
      state: {
        fromLessonComplete: true,
        completedLessonId: chapterId,
        streakUpdated: completionResult?.streakUpdated ?? streakUpdated,
        coinsAwarded: completionResult?.coinsAwarded ?? coinsAwarded,
        vocabWordCount: vocabCount,
        autoStartNext,
      },
    });
  }, [navigate, persistComplete, streakUpdated, coinsAwarded, chapterId, lessonData?.screens]);

  const screens = useMemo(() => lessonData?.screens || [], [lessonData?.screens]);
  const vocabWordCount = useMemo(
    () => screens.filter((s) => s.type === "vocab").length,
    [screens],
  );
  const currentScreen = screens[screenIndex] || null;

  // Compute conversation history by looking backwards for contiguous conversation screens
  const conversationHistory = useMemo(() => {
    const history = [];
    if (currentScreen?.type !== "conversation") return history;
    for (let i = screenIndex - 1; i >= 0; i--) {
      if (screens[i].type === "conversation") {
        history.unshift({ screen: screens[i], screenIndex: i });
      } else {
        break;
      }
    }
    return history;
  }, [currentScreen?.type, screenIndex, screens]);

  const progressEligibleIndices = useMemo(
    () =>
      screens
        .map((screen, idx) =>
          ["intro", "scenario"].includes(screen.type) ? null : idx,
        )
        .filter((idx) => idx !== null),
    [screens],
  );
  const completedEligibleScreens = progressEligibleIndices.filter(
    (idx) => idx <= screenIndex,
  ).length;
  const totalEligibleScreens = progressEligibleIndices.length;

  // Progress bar ratio excludes intro/scenario screens from UI and calculation.
  const progressRatio =
    totalEligibleScreens > 0
      ? completedEligibleScreens / totalEligibleScreens
      : 0;
  const showProgressBar = !["intro", "scenario"].includes(
    currentScreen?.type || "",
  );

  const isCorrectSelectionForScreen = useCallback((screen, selectionIndex) => {
    if (selectionIndex === null || selectionIndex === undefined) return false;
    if (Array.isArray(screen?.correctOptionIndexes)) {
      return screen.correctOptionIndexes.includes(selectionIndex);
    }
    return selectionIndex === screen?.correctOptionIndex;
  }, []);

  const resolvePrevIndex = useCallback(
    (currentIdx) => {
      if (!screens?.length || currentIdx <= 0) return -1;
      let targetIdx = currentIdx - 1;

      // Conversation back should leave the whole conversation block.
      if (screens[currentIdx]?.type === "conversation") {
        while (targetIdx >= 0 && screens[targetIdx]?.type === "conversation") {
          targetIdx -= 1;
        }
      }

      // Skip scenario on back nav, but keep intro reachable.
      while (targetIdx >= 0 && screens[targetIdx]?.type === "scenario") {
        targetIdx -= 1;
      }

      return targetIdx;
    },
    [screens],
  );

  const hydrateStateForScreen = useCallback(
    (targetIdx) => {
      const targetScreen = screens[targetIdx];
      const targetType = targetScreen?.type;

      setQuizState("idle");
      setDragQuizState("idle");
      setWrongPair(null);
      setSelectedLeft(null);
      setSelectedRight(null);
      setRecentMatch(null);

      if (targetType === "quiz" || targetType === "listen_choose") {
        const restoredSelection = solvedOptionSelections[targetIdx];
        setSelectedOption(
          restoredSelection === undefined ? null : restoredSelection,
        );
        setMatchedPairs([]);
        return;
      }

      if (targetType === "conversation") {
        setSelectedOption(null);
        setMatchedPairs([]);
        return;
      }

      if (targetType === "match_following") {
        const restoredPairs = solvedMatchFollowingMap[targetIdx];
        setMatchedPairs(Array.isArray(restoredPairs) ? restoredPairs : []);
        setSelectedOption(null);
        return;
      }

      if (targetType === "match_image") {
        const restoredDragState = solvedDragScreensMap[targetIdx];
        if (restoredDragState?.placedItems) {
          setPlacedItems(restoredDragState.placedItems);
          setSlotStatuses(restoredDragState.slotStatuses || {});
          setDragQuizState("correct");
        } else {
          const initPlaced = {};
          (targetScreen?.slots || []).forEach((slot) => {
            initPlaced[slot.id] = null;
          });
          setPlacedItems(initPlaced);
          setSlotStatuses({});
        }
        setSelectedOption(null);
        setMatchedPairs([]);
        return;
      }

      if (targetType === "unjumble") {
        setSelectedOption(null);
        setMatchedPairs([]);
        return;
      }

      setSelectedOption(null);
      setMatchedPairs([]);
    },
    [screens, solvedOptionSelections, solvedMatchFollowingMap, solvedDragScreensMap],
  );

  const handlePrevScreen = useCallback(async () => {
    const prevIndex = resolvePrevIndex(screenIndex);
    if (prevIndex < 0) return;
    if (
      currentScreen?.type === "conversation" &&
      screens[prevIndex]?.type === "conversation_intro"
    ) {
      setConversationResumeIndex(screenIndex);
    } else {
      setConversationResumeIndex(null);
    }
    setScreenIndex(prevIndex);
    hydrateStateForScreen(prevIndex);
    await persistProgress(prevIndex);
  }, [
    screenIndex,
    resolvePrevIndex,
    hydrateStateForScreen,
    persistProgress,
    currentScreen,
    screens,
  ]);

  useEffect(() => {
    if (!screens?.length) return;
    hydrateStateForScreen(screenIndex);
  }, [screenIndex, screens, hydrateStateForScreen]);

  useEffect(() => {
    if (!currentScreen) return;
    const stage = getLgGuideStage();
    const shouldGuideTapScreen =
      (currentScreen.type === "intro" &&
        stage === LG_GUIDE_STAGES.CHAPTER_CLICK_DONE) ||
      (currentScreen.type === "scenario" &&
        (stage === LG_GUIDE_STAGES.CHAPTER_CLICK_DONE ||
          stage === LG_GUIDE_STAGES.TAP_TIP_DONE));
    if (
      shouldGuideTapScreen
    ) {
      if (tapGuideDelayTimerRef.current) {
        window.clearTimeout(tapGuideDelayTimerRef.current);
        tapGuideDelayTimerRef.current = null;
      }
      setTapGuidePending(true);
      setShowTapGuide(false);
      return;
    }
    if (tapGuideDelayTimerRef.current) {
      window.clearTimeout(tapGuideDelayTimerRef.current);
      tapGuideDelayTimerRef.current = null;
    }
    setTapGuidePending(false);
    setShowTapGuide(false);
  }, [currentScreen]);

  const handleTapDialogueDone = useCallback(() => {
    if (!tapGuidePending) return;
    if (tapGuideDelayTimerRef.current) {
      window.clearTimeout(tapGuideDelayTimerRef.current);
    }
    tapGuideDelayTimerRef.current = window.setTimeout(() => {
      setShowTapGuide(true);
      tapGuideDelayTimerRef.current = null;
    }, 1000);
  }, [tapGuidePending]);

  const completeTapGuide = useCallback((meta = {}) => {
    if (!showTapGuide) return;
    const nextScreen = screens[screenIndex + 1];
    const hasUpcomingScenario =
      nextScreen?.type === "scenario" ||
      screens.slice(screenIndex + 1).some((screen) => screen?.type === "scenario");
    const nextStage =
      currentScreen?.type === "scenario" && meta.hasMoreDialogue
        ? LG_GUIDE_STAGES.TAP_TIP_DONE
        : currentScreen?.type === "intro" && hasUpcomingScenario
        ? LG_GUIDE_STAGES.TAP_TIP_DONE
        : currentScreen?.type === "scenario" && nextScreen?.type === "scenario"
          ? LG_GUIDE_STAGES.TAP_TIP_DONE
          : LG_GUIDE_STAGES.COMPLETE;
    setLgGuideStage(nextStage);
    setShowTapGuide(false);
    setTapGuidePending(
      currentScreen?.type === "scenario" &&
        meta.hasMoreDialogue &&
        nextStage === LG_GUIDE_STAGES.TAP_TIP_DONE,
    );
    if (tapGuideDelayTimerRef.current) {
      window.clearTimeout(tapGuideDelayTimerRef.current);
      tapGuideDelayTimerRef.current = null;
    }
  }, [currentScreen?.type, screenIndex, screens, showTapGuide]);

  useEffect(() => {
    if (!showTapGuide) {
      setTapGuideTargetRect(null);
      return;
    }
    const updateTargetRect = () => {
      const targetEl = document.getElementById("lg-tap-indicator");
      if (!targetEl) {
        setTapGuideTargetRect(null);
        return;
      }
      const rect = targetEl.getBoundingClientRect();
      setTapGuideTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    };
    updateTargetRect();
    window.addEventListener("resize", updateTargetRect);
    window.addEventListener("scroll", updateTargetRect, true);
    return () => {
      window.removeEventListener("resize", updateTargetRect);
      window.removeEventListener("scroll", updateTargetRect, true);
    };
  }, [showTapGuide, screenIndex]);

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  const handleNext = (forcedSelectedOption = null) => {
    // Stop Maya TTS
    window.dispatchEvent(new CustomEvent("mayaTTSStop"));
    // Stop any speakWord audio
    if (currentSpeakAudioRef.current) {
      currentSpeakAudioRef.current.pause();
      currentSpeakAudioRef.current.src = "";
      currentSpeakAudioRef.current = null;
    }
    setIsSpeaking(false);
    setCurrentlySpeakingText("");
    hapticLight();

    if (
      currentScreen.type === "match_following" &&
      matchedPairs.length < (currentScreen.leftItems?.length || 5)
    )
      return;

    let nextIndex = screenIndex + 1;
    if (
      currentScreen.type === "conversation_intro" &&
      Number.isInteger(conversationResumeIndex) &&
      conversationResumeIndex > screenIndex &&
      conversationResumeIndex < screens.length &&
      screens[conversationResumeIndex]?.type === "conversation"
    ) {
      nextIndex = conversationResumeIndex;
    }
    const selectedForCommit =
      forcedSelectedOption !== null ? forcedSelectedOption : selectedOption;

    if (
      (currentScreen.type === "quiz" || currentScreen.type === "listen_choose") &&
      isCorrectSelectionForScreen(currentScreen, selectedForCommit)
    ) {
      setSolvedOptionSelections((prev) => ({
        ...prev,
        [screenIndex]: selectedForCommit,
      }));
    }

    if (
      currentScreen.type === "conversation" &&
      selectedForCommit !== null &&
      isCorrectSelectionForScreen(currentScreen, selectedForCommit)
    ) {
      setSolvedOptionSelections((prev) => ({
        ...prev,
        [screenIndex]: selectedForCommit,
      }));
    }

    if (currentScreen.type === "match_following") {
      const requiredPairs = currentScreen.leftItems?.length || 0;
      if (matchedPairs.length >= requiredPairs && requiredPairs > 0) {
        setSolvedMatchFollowingMap((prev) => ({
          ...prev,
          [screenIndex]: [...matchedPairs],
        }));
      }
    }

    if (currentScreen.type === "match_image" && dragQuizState === "correct") {
      setSolvedDragScreensMap((prev) => ({
        ...prev,
        [screenIndex]: {
          placedItems: { ...placedItems },
          slotStatuses: { ...slotStatuses },
        },
      }));
    }

    if (nextIndex < screens.length) {
      const nextScreen = screens[nextIndex];

      // Outro is treated as modal content source: open completion over current screen.
      if (nextScreen.type === "outro") {
        setAnsweredScreenMap((prev) => ({ ...prev, [screenIndex]: true }));
        if (
          currentScreen.type === "conversation" &&
          selectedForCommit !== null
        ) {
          setConversationSelections((prev) => ({
            ...prev,
            [screenIndex]: selectedForCommit,
          }));
          setSelectedOption(null);
          setShowConversationCompletedFallback(true);
        }
        setCompletionDialogue(getCompletionDialogue(lessonData, nextScreen));
        setLevelComplete(true);
        persistComplete();
        return;
      }

      setScreenIndex(nextIndex);
      setConversationResumeIndex(null);
      setAnsweredScreenMap((prev) => ({ ...prev, [screenIndex]: true }));

      // If we just left a conversation screen, record what the user picked
      if (
        currentScreen.type === "conversation" &&
        selectedForCommit !== null
      ) {
        setConversationSelections((prev) => ({
          ...prev,
          [screenIndex]: selectedForCommit,
        }));
      }

      // Reset per-screen state
      setSelectedOption(null);
      setQuizState("idle");
      setDragQuizState("idle");
      setSlotStatuses({});
      setMatchedPairs([]);
      setSelectedLeft(null);
      setSelectedRight(null);
      setWrongPair(null);

      // Initialise drag state for the incoming screen
      if (nextScreen.type === "match_image" || nextScreen.type === "unjumble") {
        const initPlaced = {};
        (nextScreen.slots || []).forEach((slot) => {
          initPlaced[slot.id] = null;
        });
        setPlacedItems(initPlaced);
      }

      // Persist partial progress (non-blocking)
      persistProgress(nextIndex);
    } else {
      // Last screen done — fire completion
      if (
        currentScreen.type === "conversation" &&
        selectedForCommit !== null
      ) {
        setConversationSelections((prev) => ({
          ...prev,
          [screenIndex]: selectedForCommit,
        }));
        setSelectedOption(null);
        setShowConversationCompletedFallback(true);
      }
      setCompletionDialogue(getCompletionDialogue(lessonData, currentScreen));
      setLevelComplete(true);
      persistComplete();
    }
  };

  const handleTapGuideSpotlightClick = (event) => {
    event.stopPropagation();
    // For scenario screens the Continue button drives guide completion — do nothing here.
    if (currentScreen?.type === "scenario") return;
    completeTapGuide();
    handleNext();
  };

  // ---------------------------------------------------------------------------
  // Match-the-following handlers
  // ---------------------------------------------------------------------------

  const handleLeftClick = (id) => {
    if (matchedPairs.includes(id)) return;
    if (selectedRight) {
      const leftItem = currentScreen.leftItems?.find((l) => l.id === id);
      const isMatch = leftItem?.matchId === selectedRight;
      if (isMatch) {
        hapticMedium();
        setMatchedPairs((prev) => [...prev, id]);
        setRecentMatch({ left: id, right: selectedRight });
        setSelectedRight(null);
        setTimeout(() => setRecentMatch(null), 600);
      } else {
        hapticHeavy();
        setWrongPair({ left: id, right: selectedRight });
        setSelectedRight(null);
        setTimeout(() => setWrongPair(null), 600);
      }
    } else {
      setSelectedLeft(id);
      setWrongPair(null);
    }
  };

  const handleRightClick = (id) => {
    const correspondingLeftId = currentScreen.leftItems?.find(
      (l) => l.matchId === id,
    )?.id;
    if (matchedPairs.includes(correspondingLeftId)) return;
    if (selectedLeft) {
      const isMatch =
        currentScreen.leftItems?.find((l) => l.id === selectedLeft)?.matchId ===
        id;
      if (isMatch) {
        hapticMedium();
        setMatchedPairs((prev) => [...prev, selectedLeft]);
        setRecentMatch({ left: selectedLeft, right: id });
        setSelectedLeft(null);
        setTimeout(() => setRecentMatch(null), 600);
      } else {
        hapticHeavy();
        setWrongPair({ left: selectedLeft, right: id });
        setSelectedLeft(null);
        setTimeout(() => setWrongPair(null), 600);
      }
    } else {
      setSelectedRight(id);
      setWrongPair(null);
    }
  };

  // ---------------------------------------------------------------------------
  // AWS Polly TTS
  // ---------------------------------------------------------------------------

  const speakWord = async (text) => {
    hapticMedium();
    // Cancel any currently playing speakWord audio before starting a new one
    if (currentSpeakAudioRef.current) {
      currentSpeakAudioRef.current.pause();
      currentSpeakAudioRef.current.src = "";
      currentSpeakAudioRef.current = null;
    }
    if (currentSpeakObjectUrlRef.current) {
      URL.revokeObjectURL(currentSpeakObjectUrlRef.current);
      currentSpeakObjectUrlRef.current = null;
    }
    setIsSpeaking(true);
    setCurrentlySpeakingText(text);

    try {
      const blob = await getGermanTTSBlob(text);
      const audioUrl = URL.createObjectURL(blob);
      currentSpeakObjectUrlRef.current = audioUrl;
      const audio = new Audio(audioUrl);
      currentSpeakAudioRef.current = audio;
      const cleanupAudio = () => {
        setIsSpeaking(false);
        setCurrentlySpeakingText("");
        if (currentSpeakAudioRef.current === audio) {
          currentSpeakAudioRef.current = null;
        }
        if (currentSpeakObjectUrlRef.current === audioUrl) {
          URL.revokeObjectURL(audioUrl);
          currentSpeakObjectUrlRef.current = null;
        }
      };
      audio.onended = cleanupAudio;
      audio.onerror = cleanupAudio;
      audio.play();
    } catch (err) {
      console.error("TTS playback failed, falling back to browser synthesis", err);
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "de-DE";
        utterance.onend = () => { setIsSpeaking(false); setCurrentlySpeakingText(""); };
        utterance.onerror = () => { setIsSpeaking(false); setCurrentlySpeakingText(""); };
        window.speechSynthesis.speak(utterance);
      } else {
        setIsSpeaking(false);
        setCurrentlySpeakingText("");
      }
    }
  };

  // ---------------------------------------------------------------------------
  // MCQ quiz check
  // ---------------------------------------------------------------------------

  const handleCheckQuiz = (e, explicitSelection = null) => {
    if (e) e.stopPropagation();
    const sel = explicitSelection !== null ? explicitSelection : selectedOption;
    let isCorrect = false;
    if (currentScreen.correctOptionIndexes) {
      isCorrect = currentScreen.correctOptionIndexes.includes(sel);
    } else {
      isCorrect = sel === currentScreen.correctOptionIndex;
    }
    setQuizState(isCorrect ? "correct" : "incorrect");
    if (isCorrect) hapticMedium(); else hapticHeavy();
  };

  // ---------------------------------------------------------------------------
  // Drag & Drop handlers
  // ---------------------------------------------------------------------------

  const handleDragStart = (event) => {
    const { active } = event;
    const itemsBank = currentScreen.items || [];
    const itemData = itemsBank.find((i) => i.id === active.id);
    setActiveDragItem(itemData);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveDragItem(null);

    const slots = currentScreen.slots || [];
    const itemsBank = currentScreen.items || [];

    // Identify if the dragged item was already placed in a slot
    const fromSlotId = Object.keys(placedItems).find(
      (key) => placedItems[key]?.id === active.id,
    );

    // Guard: never move an item out of a confirmed-correct slot
    if (fromSlotId && slotStatuses[fromSlotId] === "correct") return;

    const newPlacedItems = { ...placedItems };
    const newStatuses = { ...slotStatuses };

    // ---- Case 1: dropped onto a droppable slot --------------------------------
    if (over) {
      const toSlotId = over.id;

      // Guard: never drop onto a confirmed-correct slot
      if (slotStatuses[toSlotId] === "correct") return;

      const itemData = itemsBank.find((i) => i.id === active.id);
      const itemAtTarget = newPlacedItems[toSlotId];

      if (fromSlotId) {
        // ---- Slot-to-slot drag -----------------------------------------------
        // Always swap: place dragged item at target, put displaced item (if any)
        // back into the source slot.
        newPlacedItems[fromSlotId] = itemAtTarget || null;
        newStatuses[fromSlotId] = null;
        newPlacedItems[toSlotId] = itemData;
        newStatuses[toSlotId] = null;
      } else {
        // ---- Bank-to-slot drag -----------------------------------------------
        if (currentScreen.type === "match_image") {
          // Place the item in the hovered/dropped slot specifically
          newPlacedItems[toSlotId] = itemData;
          newStatuses[toSlotId] = null;
        } else {
          // Fallback original behavior for any other screens
          const firstEmpty = slots.find((s) => !newPlacedItems[s.id]);
          if (firstEmpty) {
            newPlacedItems[firstEmpty.id] = itemData;
            newStatuses[firstEmpty.id] = null;
          }
        }
      }

      setPlacedItems(newPlacedItems);
      setSlotStatuses(newStatuses);
      setDragQuizState("idle");
      return;
    }

    // ---- Case 2: dropped outside any slot (over is null) ----------------------
    if (fromSlotId) {
      // Placed pill dragged back to bank area ? remove it from its slot
      newPlacedItems[fromSlotId] = null;
      newStatuses[fromSlotId] = null;
      setPlacedItems(newPlacedItems);
      setSlotStatuses(newStatuses);
      setDragQuizState("idle");
    } else {
      // Bank item dragged and released outside ? auto-place in first empty slot
      handleBankItemClick(active.id);
    }
  };


  const checkDragQuiz = () => {
    const currentSlots = currentScreen.slots || [];
    let allCorrect = true;
    const newStatuses = {};

    currentSlots.forEach((slot) => {
      const placed = placedItems[slot.id];
      if (!placed) {
        newStatuses[slot.id] = null;
        allCorrect = false;
      } else if (placed.matchId === slot.id) {
        newStatuses[slot.id] = "correct";
      } else {
        newStatuses[slot.id] = "incorrect";
        allCorrect = false;
      }
    });

    setSlotStatuses(newStatuses);
    setDragQuizState(allCorrect ? "correct" : "incorrect");
  };

  const handleRemovePlacedItem = (slotId) => {
    if (dragQuizState !== "idle") return;
    if (slotStatuses[slotId] === "correct") return;
    setSlotStatuses((prev) => ({ ...prev, [slotId]: null }));
    setPlacedItems((prev) => ({ ...prev, [slotId]: null }));
  };

  const handleBankItemClick = (itemId) => {
    if (dragQuizState !== "idle") return;
    
    // Find first empty slot
    const slots = currentScreen.slots || [];
    const firstEmptySlot = slots.find((slot) => !placedItems[slot.id]);
    
    if (firstEmptySlot) {
      const itemsBank = currentScreen.items || [];
      const itemData = itemsBank.find((i) => i.id === itemId);
      
      setPlacedItems((prev) => ({
        ...prev,
        [firstEmptySlot.id]: itemData,
      }));
      setSlotStatuses((prev) => ({
        ...prev,
        [firstEmptySlot.id]: null,
      }));
    }
  };

  // ---------------------------------------------------------------------------
  // Quiz modal handlers
  // ---------------------------------------------------------------------------

  const handleQuizModalClose = () => setQuizState("idle");

  const handleQuizModalNext = () => {
    setQuizState("idle");
    handleNext();
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="w-full lg-screen-height flex justify-center items-center">
        Loading Lesson...
      </div>
    );
  }

  if (error || !lessonData || !lessonData.screens || !currentScreen) {
    return (
      <div className="w-full lg-screen-height flex justify-center items-center">
        {error || "No lessons available"}
      </div>
    );
  }

  return (
    <div className="w-full lg-screen-height bg-gradient-to-b from-blue-100 to-sky-100 flex justify-center overflow-hidden">
      <div
        className="w-full max-w-[500px] lg-screen-height relative flex flex-col bg-gradient-to-b from-blue-100 to-sky-100 shadow-xl overflow-hidden"
        onClick={() => {
          if (
            ["outro"].includes(currentScreen.type)
          ) {
            handleNext();
          }
        }}
      >
        <div className="flex-1 w-full flex flex-col overflow-y-auto">
          <ProgressBarHostProvider enabled>
            {showProgressBar && (
              <ProgressBar
                isHost
                progressRatio={progressRatio}
                title={lessonData.title}
                level={lessonData.proficiency_level}
                floating={currentScreen.type === "conversation"}
                onBackClick={() => setShowLeaveModal(true)}
              />
            )}
            <LayoutGroup id="lesson-screen-transition">
              <AnimatePresence mode="wait">
                {currentScreen.type === "intro" && (
                  <IntroScreen
                    screen={currentScreen}
                    title={lessonData.title}
                    progressRatio={progressRatio}
                    level={lessonData.proficiency_level}
                    showTapGuide={showTapGuide}
                    onDialogueDone={handleTapDialogueDone}
                    onNext={handleNext}
                    onBackClick={() => setShowLeaveModal(true)}
                  />
                )}
                {currentScreen.type === "scenario" && (
                  <LessonScenarioScreen
                    screen={currentScreen}
                    progressRatio={progressRatio}
                    title={lessonData.title}
                    level={lessonData.proficiency_level}
                    showTapGuide={showTapGuide}
                    onTapDetected={completeTapGuide}
                    onDialogueDone={handleTapDialogueDone}
                    guidedTapNonce={guidedScenarioTapNonce}
                    onGuidedCompleteTap={handleNext}
                    onBackClick={() => setShowLeaveModal(true)}
                  />
                )}
                {currentScreen.type === "vocab" && (
                  <VocabScreen
                    screen={currentScreen}
                    onNext={handleNext}
                    onPrev={handlePrevScreen}
                    canGoPrev={resolvePrevIndex(screenIndex) >= 0}
                    speakWord={speakWord}
                    isSpeaking={isSpeaking}
                    progressRatio={progressRatio}
                    title={lessonData.title}
                    level={lessonData.proficiency_level}
                    onBackClick={() => setShowLeaveModal(true)}
                  />
                )}
                {currentScreen.type === "grammar" && (
                  <GrammarScreen
                    screen={currentScreen}
                    onNext={handleNext}
                    onPrev={handlePrevScreen}
                    canGoPrev={resolvePrevIndex(screenIndex) >= 0}
                    speakWord={speakWord}
                    isSpeaking={isSpeaking}
                    currentlySpeakingText={currentlySpeakingText}
                    progressRatio={progressRatio}
                    title={lessonData.title}
                    level={lessonData.proficiency_level}
                    onBackClick={() => setShowLeaveModal(true)}
                  />
                )}
                {currentScreen.type === "quiz" && (
                  <QuizScreen
                    screen={currentScreen}
                    onPrev={handlePrevScreen}
                    canGoPrev={resolvePrevIndex(screenIndex) >= 0}
                    selectedOption={selectedOption}
                    setSelectedOption={setSelectedOption}
                    onCheck={handleCheckQuiz}
                    speakWord={speakWord}
                    isSpeaking={isSpeaking}
                    progressRatio={progressRatio}
                    title={lessonData.title}
                    level={lessonData.proficiency_level}
                    onBackClick={() => setShowLeaveModal(true)}
                  />
                )}
                {currentScreen.type === "match_following" && (
                  <MatchFollowingScreen
                    screen={currentScreen}
                    selectedLeft={selectedLeft}
                    selectedRight={selectedRight}
                    wrongPair={wrongPair}
                    matchedPairs={matchedPairs}
                    recentMatch={recentMatch}
                    onLeftClick={handleLeftClick}
                    onRightClick={handleRightClick}
                    onNext={handleNext}
                    onPrev={handlePrevScreen}
                    canGoPrev={resolvePrevIndex(screenIndex) >= 0}
                    progressRatio={progressRatio}
                    title={lessonData.title}
                    level={lessonData.proficiency_level}
                    onBackClick={() => setShowLeaveModal(true)}
                  />
                )}
                {currentScreen.type === "match_image" && (
                  <MatchImageScreen
                    screen={currentScreen}
                    sensors={sensors}
                    placedItems={placedItems}
                    slotStatuses={slotStatuses}
                    dragQuizState={dragQuizState}
                    activeDragItem={activeDragItem}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onCheck={checkDragQuiz}
                    onRemove={handleRemovePlacedItem}
                    onNext={handleNext}
                    onCloseModal={() => setDragQuizState("idle")}
                    progressRatio={progressRatio}
                    title={lessonData.title}
                    level={lessonData.proficiency_level}
                    onBackClick={() => setShowLeaveModal(true)}
                  />
                )}
                {currentScreen.type === "listen_choose" && (
                  <ListenAndChooseScreen
                    screen={currentScreen}
                    onPrev={handlePrevScreen}
                    canGoPrev={resolvePrevIndex(screenIndex) >= 0}
                    selectedOption={selectedOption}
                    setSelectedOption={setSelectedOption}
                    onCheck={handleCheckQuiz}
                    speakWord={speakWord}
                    isSpeaking={isSpeaking}
                    progressRatio={progressRatio}
                    title={lessonData.title}
                    level={lessonData.proficiency_level}
                    onBackClick={() => setShowLeaveModal(true)}
                  />
                )}
                {currentScreen.type === "unjumble" && (
                  <UnjumbleScreen
                    key={`unjumble-${screenIndex}`}
                    screen={currentScreen}
                    onNext={handleNext}
                    progressRatio={progressRatio}
                    title={lessonData.title}
                    level={lessonData.proficiency_level}
                    onBackClick={() => setShowLeaveModal(true)}
                  />
                )}
                {currentScreen.type === "conversation_intro" && (
                  <ConversationIntroScreen
                    screen={currentScreen}
                    onNext={handleNext}
                    onPrev={handlePrevScreen}
                    canGoPrev={resolvePrevIndex(screenIndex) >= 0}
                    progressRatio={progressRatio}
                    title={lessonData.title}
                    level={lessonData.proficiency_level}
                    onBackClick={() => setShowLeaveModal(true)}
                  />
                )}
                {currentScreen.type === "conversation" && (
                  <ConversationScreen
                    screen={currentScreen}
                    currentScreenIndex={screenIndex}
                    conversationHistory={conversationHistory}
                    conversationSelections={conversationSelections}
                    selectedOption={selectedOption}
                    setSelectedOption={setSelectedOption}
                    onCheck={handleCheckQuiz}
                    onNext={handleNext}
                    onPrev={handlePrevScreen}
                    canGoPrev={resolvePrevIndex(screenIndex) >= 0}
                    speakWord={speakWord}
                    isSpeaking={isSpeaking}
                    currentlySpeakingText={currentlySpeakingText}
                    progressRatio={progressRatio}
                    title={lessonData.title}
                    level={lessonData.proficiency_level}
                    showCompletedFallback={showConversationCompletedFallback}
                    onCompletedFallbackClick={navigateToLearnGermanHome}
                    floatingHeader={currentScreen.type === "conversation"}
                    onBackClick={() => setShowLeaveModal(true)}
                  />
                )}
                {currentScreen.type === "outro" && (
                  <OutroScreen screen={currentScreen} />
                )}
              </AnimatePresence>
            </LayoutGroup>
          </ProgressBarHostProvider>

          {showTapGuide && tapGuideTargetRect && (
            <TapGuideOverlay
              rect={tapGuideTargetRect}
              onClick={handleTapGuideSpotlightClick}
            />
          )}

          {/* Leave Lesson Modal */}
          <LeaveLessonModal
            isOpen={showLeaveModal}
            onClose={() => setShowLeaveModal(false)}
            onLeave={async () => {
              // Optionally persist progress again here just in case
              await persistProgress(screenIndex);
              navigate("/learn-german");
            }}
          />

          {/* MCQ Quiz Result Modal */}
          {["quiz", "listen_choose"].includes(
            currentScreen.type,
          ) && (
            <QuizResultModal
              quizState={quizState}
              onClose={handleQuizModalClose}
              onNext={handleQuizModalNext}
              correctAnswer={
                currentScreen.options
                  ? currentScreen.options[
                      currentScreen.correctOptionIndexes?.[0] ?? currentScreen.correctOptionIndex
                    ]
                  : null
              }
              selectedOptionLabel={
                selectedOption !== null && currentScreen.options
                  ? currentScreen.options[selectedOption]
                  : null
              }
            />
          )}

          {/* Level Complete Modal */}
          {levelComplete && (
            <LevelCompleteModal
              dialogueText={completionDialogue}
              completedLessonId={chapterId}
              streakUpdated={streakUpdated}
              coinsAwarded={coinsAwarded}
              vocabWordCount={vocabWordCount}
              onClose={() => setLevelComplete(false)}
              onContinue={() => navigateToLearnGermanHome({ autoStartNext: true })}
            />
          )}

        </div>
      </div>
    </div>
  );
}

