import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Shuffle, RotateCcw } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../../api/axios";
// Components
import FlashcardDeck from "./components/FlashcardDeck";
import ProgressBar from "./components/ProgressBar";
import TestView from "./components/TestView";
// Hooks (reuse from pronounce)
import useTextToSpeech from "../pronounce/hooks/useTextToSpeech";
const FlashcardStudyPage = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const { prof_level, set_id } = useParams();
  const [searchParams] = useSearchParams();
  const set_name = searchParams.get("set_name");
  // Card states
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flashcardSet, setFlashcardSet] = useState([]);
  const [order, setOrder] = useState(null);
  const [deckRotation, setDeckRotation] = useState(0);
  // Swipe states
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  // Test states
  const [showTest, setShowTest] = useState(false);
  const [showTestPrompt, setShowTestPrompt] = useState(false);
  const [testQuestions, setTestQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [completedTests, setCompletedTests] = useState(new Set());
  const [completedFinalTest, setCompletedFinalTest] = useState(false);
  const [isFinalTest, setIsFinalTest] = useState(false);

  const [loading, setLoading] = useState(true);

  const totalCards = flashcardSet.length;
  const chapterNumber = set_name?.match(/\d+/)?.[0] || "01";
  // TTS Hook
  const { isSpeaking, isLoadingAudio, speakText, cancelSpeech } =
    useTextToSpeech();
  const handleSpeak = (e) => {
    e.stopPropagation();
    const content = isFlipped
      ? flashcardSet[currentCard]?.back_content
      : flashcardSet[currentCard]?.front_content;
    if (content) speakText(content, isFlipped ? "de-DE" : "en-US");
  };
  // Data loading
  useEffect(() => {
    if (!user) navigate("/login");
    const getCards = async () => {
      setLoading(true);
      try {
        const cardsRes = await api.get(`practice/getFlashCards/${set_id}`);
        const stateRes = await api.get(`practice/getFS/${set_id}`);
        const flashcards = cardsRes.data;
        const userState = stateRes.data;
        if (!userState || userState.useDefault) {
          setOrder(new Map(flashcards.map((item, idx) => [idx, item.card_id])));
          setFlashcardSet(flashcards);
        } else {
          const orderMap = new Map(userState[0].current_order);
          const lookup = new Map(flashcards.map((c) => [c.card_id, c]));
          setFlashcardSet(
            Array.from(orderMap.values()).map((id) => lookup.get(id))
          );
          setOrder(orderMap);
          setCurrentCard(userState[0].current_index || 0);
          setCompletedFinalTest(userState[0].test_status || false);
        }
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };
    getCards();
  }, [set_id, user, navigate]);
  useEffect(() => {
    if (!order || order.size === 0) return;
    api.post("/practice/saveFS", {
      user_id: user.user_id,
      set_id,
      status: completedFinalTest,
      order: JSON.stringify(Array.from(order.entries())),
      current_index: currentCard,
    });
  }, [currentCard, user, set_id, completedFinalTest, order]);
  useEffect(() => {
    return () => cancelSpeech();
  }, []);
  // Swipe handlers
  const handleDragStart = (e) => {
    setDragStart(e.type === "mousedown" ? e.clientX : e.touches[0].clientX);
    setIsDragging(true);
    setSwipeDirection(null);
  };
  const handleDragMove = (e) => {
    if (dragStart)
      setDragOffset(
        (e.type === "mousemove" ? e.clientX : e.touches[0].clientX) - dragStart
      );
  };
  const handleDragEnd = () => {
    if (!dragStart) return;
    if (Math.abs(dragOffset) > 80) {
      if (dragOffset > 0 && currentCard > 0) {
        setSwipeDirection("right");
        setTimeout(() => {
          handlePrevious();
          setSwipeDirection(null);
          setDragOffset(0);
        }, 250);
      } else if (dragOffset < 0 && currentCard < totalCards - 1) {
        setSwipeDirection("left");
        setTimeout(() => {
          handleNext();
          setSwipeDirection(null);
          setDragOffset(0);
        }, 250);
      } else setDragOffset(0);
    } else setDragOffset(0);
    setDragStart(null);
    setIsDragging(false);
  };
  const handleCardClick = () => {
    if (!isDragging && Math.abs(dragOffset) < 10) setIsFlipped(!isFlipped);
  };
  // Navigation
  const shouldShowTest = (next) =>
    (next > 0 && next % 20 === 0 && next < totalCards) || next === totalCards;
  const handleNext = () => {
    cancelSpeech();
    if (currentCard < totalCards - 1) {
      if (shouldShowTest(currentCard + 1)) setShowTestPrompt(true);
      else {
        setCurrentCard(currentCard + 1);
        setDeckRotation((p) => (p + 1) % 3);
        setIsFlipped(false);
      }
    } else setShowTestPrompt(true);
  };
  const handlePrevious = () => {
    cancelSpeech();
    if (showTestPrompt) {
      setShowTestPrompt(false);
      setIsFlipped(false);
    } else if (currentCard > 0) {
      setCurrentCard(currentCard - 1);
      setDeckRotation((p) => (p - 1 + 3) % 3);
      setIsFlipped(false);
    }
  };
  const handleShuffle = () => {
    const s = [...flashcardSet].sort(() => Math.random() - 0.5);
    setFlashcardSet(s);
    s.forEach((i, idx) => order.set(idx, i.card_id));
    setIsFlipped(false);
    setShowTestPrompt(false);
    setCompletedTests(new Set());
    setCurrentCard(0);
    setDeckRotation(0);
  };
  const handleReset = () => {
    setCurrentCard(0);
    setIsFlipped(false);
    setCompletedTests(new Set());
    setShowTestPrompt(false);
    setDeckRotation(0);
  };
  // Test logic
  const generateTestQuestions = (indices, isFinal) => {
    const cards = indices.map((i) => flashcardSet[i]).filter(Boolean);
    if (!cards.length) return [];
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    let qs = [];
    for (let i = 0; i < (isFinal ? 21 : 5) && i < shuffled.length; i++) {
      if (shuffled.length >= 4) {
        const c = shuffled[i % shuffled.length],
          w = shuffled.filter((_, j) => j !== i % shuffled.length).slice(0, 3);
        if (w.length === 3)
          qs.push(
            i % 2 === 0
              ? {
                  type: "mcq",
                  question: c.front_content,
                  options: [
                    c.back_content,
                    ...w.map((x) => x.back_content),
                  ].sort(() => Math.random() - 0.5),
                  correctAnswer: c.back_content,
                }
              : {
                  type: "mcq",
                  question: c.back_content,
                  options: [
                    c.front_content,
                    ...w.map((x) => x.front_content),
                  ].sort(() => Math.random() - 0.5),
                  correctAnswer: c.front_content,
                }
          );
      }
    }
    for (let i = 0; i < (isFinal ? 9 : 5) && i < shuffled.length; i++) {
      const c = shuffled[((isFinal ? 21 : 5) + i) % shuffled.length],
        isT = Math.random() > 0.5,
        wIdx = ((isFinal ? 21 : 5) + i + 1) % shuffled.length;
      qs.push({
        type: "truefalse",
        question: i % 2 === 0 ? c.front_content : c.back_content,
        displayAnswer:
          i % 2 === 0
            ? isT
              ? c.back_content
              : shuffled[wIdx].back_content
            : isT
            ? c.front_content
            : shuffled[wIdx].front_content,
        correctAnswer: isT,
      });
    }
    return qs.sort(() => Math.random() - 0.5);
  };
  const startTest = () => {
    const n = currentCard + 1,
      isFin = n === totalCards || currentCard === totalCards - 1;
    setTestQuestions(
      generateTestQuestions(
        isFin
          ? Array.from({ length: totalCards }, (_, i) => i)
              .sort(() => Math.random() - 0.5)
              .slice(0, 30)
          : Array.from(
              { length: Math.min(20, n) },
              (_, i) => n - Math.min(20, n) + i
            ),
        isFin
      )
    );
    setShowTest(true);
    setShowTestPrompt(false);
    setIsFinalTest(isFin);
    setUserAnswers({});
    setTestSubmitted(false);
    setTestResults(null);
  };
  const skipTest = () => {
    setShowTestPrompt(false);
    setShowTest(false);
    if (currentCard < totalCards - 1) {
      setCurrentCard(currentCard + 1);
      setDeckRotation((p) => (p + 1) % 3);
      setIsFlipped(false);
    }
  };
  const submitTest = () => {
    let c = 0;
    testQuestions.forEach((q, i) => {
      if (userAnswers[i] === q.correctAnswer) c++;
    });
    const p = c >= Math.ceil(testQuestions.length * 0.6);
    setTestResults({ correct: c, total: testQuestions.length, passed: p });
    if (isFinalTest && p) {
      api.post("/practice/saveFS", {
        user_id: user.user_id,
        set_id,
        status: p,
        order: JSON.stringify(Array.from(order.entries())),
        current_index: currentCard,
      });
      setCompletedFinalTest(true);
    }
    if (!isFinalTest && p) {
      const nc = new Set(completedTests);
      nc.add(currentCard + 1);
      setCompletedTests(nc);
    }
    setTestSubmitted(true);
  };
  const continueAfterTest = () => {
    setShowTest(false);
    if (!isFinalTest) {
      setCurrentCard(currentCard + 1);
      setDeckRotation((p) => (p + 1) % 3);
    }
    setIsFlipped(false);
    setIsFinalTest(false);
  };
  // Render Test Views
  if (showTestPrompt || showTest) {
    return (
      <TestView
        showTestPrompt={showTestPrompt}
        showTest={showTest}
        testQuestions={testQuestions}
        userAnswers={userAnswers}
        testSubmitted={testSubmitted}
        testResults={testResults}
        isFinalTest={isFinalTest}
        currentCard={currentCard}
        totalCards={totalCards}
        profLevel={prof_level}
        onNavigateBack={() => navigate(`/practice/${prof_level}`)}
        onPrevious={handlePrevious}
        onStartTest={startTest}
        onSkipTest={skipTest}
        onAnswer={(i, a) => setUserAnswers({ ...userAnswers, [i]: a })}
        onSubmit={submitTest}
        onRetry={() => {
          setTestSubmitted(false);
          setUserAnswers({});
        }}
        onContinue={continueAfterTest}
        onBackToPrompt={() => {
          setShowTest(false);
          setShowTestPrompt(true);
        }}
      />
    );
  }

  const handleNextButton = () => {
    cancelSpeech();
    if (currentCard < totalCards - 1) {
      if (shouldShowTest(currentCard + 1)) {
        setShowTestPrompt(true);
      } else {
        setSwipeDirection("left");
        setTimeout(() => {
          setCurrentCard(currentCard + 1);
          setDeckRotation((p) => (p + 1) % 3);
          setIsFlipped(false);
          setSwipeDirection(null);
        }, 250);
      }
    } else {
      setShowTestPrompt(true);
    }
  };
  const handlePreviousButton = () => {
    cancelSpeech();
    if (showTestPrompt) {
      setShowTestPrompt(false);
      setIsFlipped(false);
    } else if (currentCard > 0) {
      setSwipeDirection("right");
      setTimeout(() => {
        setCurrentCard(currentCard - 1);
        setDeckRotation((p) => (p - 1 + 3) % 3);
        setIsFlipped(false);
        setSwipeDirection(null);
      }, 250);
    }
  };
  // Main View
  return (
    <div className="min-h-100dvh bg-white flex flex-col">
      <div className="px-4 py-2.5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(`/practice/${prof_level}`)}
            className="flex items-center gap-2 text-sm font-semibold text-[#181d27]"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <span className="text-sm font-semibold text-[#7b7b7b]">
            Flashcards
          </span>
        </div>
      </div>
      <div className="bg-gradient-to-b from-[#edfaff] to-white px-4 pt-4 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[30px] font-semibold text-[#002856] leading-[38px]">
            Ch. {chapterNumber.padStart(2, "0")}
          </h1>
          <span className="text-base font-semibold text-[#002856]">
            German Level: {prof_level?.toUpperCase()}
          </span>
        </div>
        <p className="text-xs text-black opacity-70 mb-3">
          Card {currentCard + 1} of {totalCards}
        </p>
        <ProgressBar currentCard={currentCard} totalCards={totalCards} />
      </div>
      <div className="flex flex-col items-center justify-center px-4 py-20 relative overflow-hidden">
        {loading ? (
          <div className="w-[280px] h-[430px] bg-white rounded-[20px] shadow-lg animate-pulse flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-200" />
            <div className="w-40 h-4 rounded bg-gray-200" />
            <div className="w-32 h-3 rounded bg-gray-100" />
          </div>
        ) : (
          <FlashcardDeck
            flashcardSet={flashcardSet}
            currentCard={currentCard}
            totalCards={totalCards}
            deckRotation={deckRotation}
            isFlipped={isFlipped}
            swipeDirection={swipeDirection}
            isDragging={isDragging}
            dragOffset={dragOffset}
            handleDragStart={handleDragStart}
            handleDragMove={handleDragMove}
            handleDragEnd={handleDragEnd}
            onCardClick={handleCardClick}
            onSpeak={handleSpeak}
            isSpeaking={isSpeaking}
            isLoadingAudio={isLoadingAudio}
          />
        )}
      </div>
      <div className="flex items-center justify-center gap-2 pb-8">
        <button
          onClick={handlePreviousButton}
          disabled={currentCard === 0}
          className="px-3 py-2 bg-white border border-[#d9d9d9] rounded-lg shadow-sm disabled:opacity-50 hover:bg-gray-50"
        >
          <ChevronLeft className="w-6 h-6 text-[#414651]" />
        </button>
        <button
          onClick={handleShuffle}
          className="px-3 py-2 bg-white border border-[#d9d9d9] rounded-lg shadow-sm hover:bg-gray-50 flex items-center gap-1.5"
        >
          <Shuffle className="w-[18px] h-[18px] text-[#181d27]" />
          <span className="text-sm font-semibold text-[#181d27]">Shuffle</span>
        </button>
        <button
          onClick={handleReset}
          className="px-3 py-2 bg-white border border-[#d9d9d9] rounded-lg shadow-sm hover:bg-gray-50 flex items-center gap-1.5"
        >
          <RotateCcw className="w-[18px] h-[18px] text-[#181d27]" />
          <span className="text-sm font-semibold text-[#181d27]">Reset</span>
        </button>
        <button
          onClick={handleNextButton}
          disabled={
            currentCard === totalCards - 1 && !shouldShowTest(currentCard + 1)
          }
          className="px-3 py-2 bg-white border border-[#d9d9d9] rounded-lg shadow-sm disabled:opacity-50 hover:bg-gray-50"
        >
          <ChevronRight className="w-6 h-6 text-[#414651]" />
        </button>
      </div>
    </div>
  );
};
export default FlashcardStudyPage;
