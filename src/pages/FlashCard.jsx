import React, { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Shuffle,
  RotateCw,
  Check,
  X,
  BookOpen,
  AlertCircle,
  Target,
  Volume2,
} from "lucide-react";
import { useSwipeable } from "react-swipeable";
import api from "../api/axios";
import {
  useNavigate,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useSelector } from "react-redux";
const FlashcardStudyPage = () => {
  const { user } = useSelector((state) => state.auth);

  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flashcardSet, setFlashcardSet] = useState([]);
  const [showTest, setShowTest] = useState(false);
  const [testQuestions, setTestQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [completedTests, setCompletedTests] = useState(new Set());
  const [completedFinalTest, setCompletedFinalTest] = useState(false);
  const [isFinalTest, setIsFinalTest] = useState(false);
  const [showTestPrompt, setShowTestPrompt] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [Progress, setProgress] = useState(0);
  const [order, setOrder] = useState(null);

  // Swipe animation states
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const { prof_level, set_id } = useParams();
  // const [SetId,setSetID] = useState(set_id)
  const [searchParams] = useSearchParams();
  const set_name = searchParams.get("set_name");
  // const test_status = searchParams.get("test_status");
  const navigate = useNavigate();

  // Speech synthesis function
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  // Azure TTS function
  const speakText = async (text, language = "de-DE") => {
    try {
      setIsLoadingAudio(true);
      setIsSpeaking(true);
      const response = await api.post(
        "/tts/speak",
        {
          text,
          language,
        },
        {
          responseType: "blob", // Important: receive audio as blob
        }
      );
      // Create audio URL from blob
      const audioBlob = new Blob([response.data], { type: "audio/mpeg" });
      const audioUrl = URL.createObjectURL(audioBlob);

      // Play audio
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl); // Clean up
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        setIsLoadingAudio(false);
        alert("Failed to play audio");
      };

      await audio.play();
      setIsLoadingAudio(false);
    } catch (err) {
      console.error("TTS Error:", err);
      setIsSpeaking(false);
      setIsLoadingAudio(false);

      // Fallback to browser TTS if Azure fails
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language;
        utterance.rate = 0.9;
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      } else {
        alert("Text-to-speech failed. Please try again.");
      }
    }
  };
  // useEffect(()=>{
  //   if (isFlipped){
  //     if (flashcardSet[currentCard]?.back_content) {
  //     speakText(flashcardSet[currentCard].back_content, 'de-DE');
  //   }
  //   }
  //   else{
  //    if (flashcardSet[currentCard]?.front_content) {
  //     speakText(flashcardSet[currentCard].front_content, 'en-En');
  //   }
  // }
  // },[currentCard,flashcardSet,isFlipped])

  const handleSpeakFront = async (e) => {
    e.stopPropagation();
    if (flashcardSet[currentCard]?.front_content) {
      await speakText(flashcardSet[currentCard].front_content, "en-US");
    }
  };

  const handleSpeakBack = async (e) => {
    e.stopPropagation();
    if (flashcardSet[currentCard]?.back_content) {
      await speakText(flashcardSet[currentCard].back_content, "de-DE");
    }
  };

  useEffect(() => {
    const getCards = async () => {
      try {
        const cardsRes = await api.get(`practice/getFlashCards/${set_id}`);
        const flashcards = cardsRes.data;

        const stateRes = await api.get(`practice/getFS/${set_id}`);
        const userState = stateRes.data;

        if (!userState || userState.useDefault) {
          const defaultMap = new Map(
            flashcards.map((item, idx) => [idx, item.card_id])
          );
          setOrder(defaultMap);
          setFlashcardSet(flashcards);
        } else {
          // console.log(userState[0].current_order);
          const orderMap = new Map(userState[0].current_order);
          // console.log(orderMap);
          const lookup = new Map(flashcards.map((c) => [c.card_id, c]));
          const orderedFlashcards = Array.from(orderMap.values()).map((id) =>
            lookup.get(id)
          );
          setFlashcardSet(orderedFlashcards);
          setOrder(orderMap);
          setCurrentCard(userState[0].current_index || 0);
          setCompletedFinalTest(userState[0].test_status || false);
        }
      } catch (err) {
        console.log(err);
      }
    };
    getCards();
  }, [set_id]);

  useEffect(() => {
    try {
      const saveSate = async () => {
        try {
          const res = await api.post("/practice/saveFS", {
            user_id: user.user_id,
            set_id: set_id,
            status: completedFinalTest,
            order: JSON.stringify(Array.from(order.entries())),
            current_index: currentCard,
          });
        } catch (err) {
          console.log(err);
        }
      };
      saveSate();
    } catch (err) {
      console.log(err);
    }
  }, [currentCard, user, set_id, completedFinalTest, order]);

  useEffect(() => {
    if (!order || order.size === 0) return;

    const lookup = new Map(flashcardSet.map((c) => [c.card_id, c]));
    const orderedFlashcards = Array.from(order.values()).map((id) =>
      lookup.get(id)
    );

    const currentOrder = flashcardSet.map((c) => c.card_id).join(",");
    const newOrder = orderedFlashcards.map((c) => c?.card_id).join(",");

    if (currentOrder !== newOrder) {
      setFlashcardSet(orderedFlashcards);
    }
  }, [order]);

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);
  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  const totalCards = flashcardSet.length;

  useEffect(() => {
    const progress = ((currentCard + 1) / totalCards) * 100;
    setProgress(progress);
  }, [currentCard, totalCards]);

  const handleTestClick = () => {
    setCurrentCard(totalCards - 1);
    setShowTestPrompt(true);
  };

  const getTestBreakpoints = () => {
    const breakpoints = [];
    for (let i = 20; i <= totalCards; i += 20) {
      if (i < totalCards) {
        breakpoints.push(i);
      }
    }
    return breakpoints;
  };

  const testBreakpoints = getTestBreakpoints();

  const getTestStatus = (breakpoint) => {
    return completedTests.has(breakpoint) ? "completed" : "pending";
  };

  const generateTestQuestions = (cardIndices, isFinal = false) => {
    var questions = [];
    const availableCards = cardIndices
      .map((i) => flashcardSet[i])
      .filter(Boolean);

    if (availableCards.length === 0) return [];

    const shuffled = [...availableCards].sort(() => Math.random() - 0.5);

    if (isFinal) {
      const numMCQs = 21;
      const numTrueFalse = 9;

      for (let i = 0; i < numMCQs && i < shuffled.length; i++) {
        if (shuffled.length >= 4) {
          const correctCard = shuffled[i % shuffled.length];
          const availableWrong = shuffled.filter(
            (_, idx) => idx !== i % shuffled.length
          );
          const wrongOptions = availableWrong.slice(0, 3);

          if (wrongOptions.length === 3) {
            if (i % 2 === 0) {
              const options = [
                correctCard.back_content,
                ...wrongOptions.map((c) => c.back_content),
              ].sort(() => Math.random() - 0.5);

              questions.push({
                type: "mcq",
                format: "std",
                question: correctCard.front_content,
                options: options,
                correctAnswer: correctCard.back_content,
              });
            } else {
              const options = [
                correctCard.front_content,
                ...wrongOptions.map((c) => c.front_content),
              ].sort(() => Math.random() - 0.5);

              questions.push({
                type: "mcq",
                format: "inv",
                question: correctCard.back_content,
                options: options,
                correctAnswer: correctCard.front_content,
              });
            }
          }
        }
      }

      for (let i = 0; i < numTrueFalse && i < shuffled.length; i++) {
        const card = shuffled[(numMCQs + i) % shuffled.length];
        const isTrue = Math.random() > 0.5;
        const wrongCardIndex = (numMCQs + i + 1) % shuffled.length;

        if (i % 2 == 0) {
          const displayAnswer = isTrue
            ? card.back_content
            : shuffled[wrongCardIndex].back_content;

          questions.push({
            type: "truefalse",
            format: "std",
            question: card.front_content,
            displayAnswer: displayAnswer,
            correctAnswer: isTrue,
          });
        } else {
          const displayAnswer = isTrue
            ? card.front_content
            : shuffled[wrongCardIndex].back_content;

          questions.push({
            type: "truefalse",
            format: "inv",
            question: card.back_content,
            displayAnswer: displayAnswer,
            correctAnswer: isTrue,
          });
        }
      }
    } else {
      const numMCQs = 5;
      const numTrueFalse = 5;

      for (let i = 0; i < numMCQs && i < shuffled.length; i++) {
        if (shuffled.length >= 4) {
          const correctCard = shuffled[i];
          const availableWrong = shuffled.filter((_, idx) => idx !== i);
          const wrongOptions = availableWrong.slice(0, 3);

          if (wrongOptions.length === 3) {
            if (i % 2 === 0) {
              const options = [
                correctCard.back_content,
                ...wrongOptions.map((c) => c.back_content),
              ].sort(() => Math.random() - 0.5);

              questions.push({
                type: "mcq",
                format: "std",
                question: correctCard.front_content,
                options: options,
                correctAnswer: correctCard.back_content,
              });
            } else {
              const options = [
                correctCard.front_content,
                ...wrongOptions.map((c) => c.front_content),
              ].sort(() => Math.random() - 0.5);

              questions.push({
                type: "mcq",
                format: "inv",
                question: correctCard.back_content,
                options: options,
                correctAnswer: correctCard.front_content,
              });
            }
          }
        }
      }
      // console.log(shuffled.length);
      for (let i = 0; i < numTrueFalse && i < shuffled.length; i++) {
        const card = shuffled[(numMCQs + i) % shuffled.length];
        const isTrue = Math.random() > 0.5;
        const wrongCardIndex = (numMCQs + i + 1) % shuffled.length;

        // console.log(wrongCardIndex);

        if (i % 2 === 0) {
          const displayAnswer = isTrue
            ? card.back_content
            : shuffled[wrongCardIndex].back_content;
          // console.log(displayAnswer);
          questions.push({
            type: "truefalse",
            format: "std",
            question: card.front_content,
            displayAnswer: displayAnswer,
            correctAnswer: isTrue,
          });
        } else {
          const displayAnswer = isTrue
            ? card.front_content
            : shuffled[wrongCardIndex].front_content;
          // console.log(displayAnswer);
          questions.push({
            type: "truefalse",
            format: "inv",
            question: card.back_content,
            displayAnswer: displayAnswer,
            correctAnswer: isTrue,
          });
        }
      }
    }
    questions = [...questions].sort(() => Math.random() - 0.5);
    // console.log(questions);
    return questions;
  };

  const shouldShowTest = (nextCard) => {
    if (nextCard > 0 && nextCard % 20 === 0 && nextCard < totalCards) {
      return true;
    }
    if (nextCard === totalCards) {
      return true;
    }
    return false;
  };

  // Swipe handlers for animation
  const handleDragStart = (e) => {
    const clientX = e.type === "mousedown" ? e.clientX : e.touches[0].clientX;
    setDragStart(clientX);
    setIsDragging(true);
    setSwipeDirection(null);
  };

  const handleDragMove = (e) => {
    if (!dragStart) return;

    const clientX = e.type === "mousemove" ? e.clientX : e.touches[0].clientX;
    const delta = clientX - dragStart;
    setDragOffset(delta);
  };

  const handleDragEnd = () => {
    if (!dragStart) return;

    const swipeThreshold = 100;

    if (Math.abs(dragOffset) > swipeThreshold) {
      if (dragOffset > 0) {
        // Swiped right - go to previous
        setSwipeDirection("right");
        setTimeout(() => {
          handlePrevious();
          setSwipeDirection(null);
          setDragOffset(0);
        }, 300);
      } else {
        // Swiped left - go to next
        setSwipeDirection("left");
        setTimeout(() => {
          handleNext();
          setSwipeDirection(null);
          setDragOffset(0);
        }, 300);
      }
    } else {
      setDragOffset(0);
    }

    setDragStart(null);
    setIsDragging(false);
  };

  const handleCardFlip = (e) => {
    if (!isDragging && Math.abs(dragOffset) < 10) {
      setIsFlipped(!isFlipped);
    }
  };

  const getCardTransform = () => {
    if (swipeDirection === "left") {
      return "translateX(-120%) rotate(-20deg)";
    } else if (swipeDirection === "right") {
      return "translateX(120%) rotate(20deg)";
    } else if (isDragging && dragOffset !== 0) {
      const rotation = dragOffset * 0.05;
      return `translateX(${dragOffset}px) rotate(${rotation}deg)`;
    }
    return "translateX(0) rotate(0deg)";
  };

  const handleNext = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    if (currentCard < totalCards - 1) {
      const nextCard = currentCard + 1;

      if (shouldShowTest(nextCard)) {
        setShowTestPrompt(true);
      } else {
        setCurrentCard(nextCard);
        setIsFlipped(false);
      }
    } else if (currentCard === totalCards - 1) {
      setShowTestPrompt(true);
    }
  };

  const handlePrevious = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    if (showTestPrompt) {
      setShowTestPrompt(false);
      setIsFlipped(false);
    } else if (currentCard > 0) {
      setCurrentCard(currentCard - 1);
      setIsFlipped(false);
    }
  };

  const startTest = () => {
    const nextCard = currentCard + 1;
    let cardIndices;
    const isFinal = nextCard === totalCards || currentCard === totalCards - 1;

    if (isFinal) {
      const allIndices = Array.from({ length: totalCards }, (_, i) => i);
      const numCards = Math.min(30, totalCards);
      cardIndices = allIndices
        .sort(() => Math.random() - 0.5)
        .slice(0, numCards);
    } else {
      const numCards = Math.min(20, nextCard);
      cardIndices = Array.from(
        { length: numCards },
        (_, i) => nextCard - numCards + i
      );
    }

    const questions = generateTestQuestions(cardIndices, isFinal);
    setTestQuestions(questions);
    setShowTest(true);
    setShowTestPrompt(false);
    setIsFinalTest(isFinal);
    setUserAnswers({});
    setTestSubmitted(false);
    setTestResults(null);
  };

  const skipTest = () => {
    setShowTestPrompt(false);
    setShowTest(false);
    setTestSubmitted(false);
    setTestResults(null);
    if (currentCard < totalCards - 1) {
      setCurrentCard(currentCard + 1);
      setIsFlipped(false);
    }
  };

  const handleShuffle = () => {
    const shuffle = [...flashcardSet];

    for (let i = shuffle.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffle[i], shuffle[j]] = [shuffle[j], shuffle[i]];
    }
    // console.log(shuffle);
    setFlashcardSet(shuffle);
    setIsFlipped(false);
    setShowTestPrompt(false);
    setCompletedTests(new Set());
    shuffle.forEach((item, idx) => {
      order.set(idx, item.card_id);
    });
    setCurrentCard(0);
  };

  const handleReset = () => {
    setCurrentCard(0);
    setIsFlipped(false);
    setCompletedTests(new Set());
    setShowTestPrompt(false);
  };

  const handleTestAnswer = (questionIndex, answer) => {
    setUserAnswers({
      ...userAnswers,
      [questionIndex]: answer,
    });
  };

  const submitTest = () => {
    let correct = 0;
    testQuestions.forEach((q, index) => {
      const userAnswer = userAnswers[index];
      if (q.type === "mcq" && userAnswer === q.correctAnswer) {
        correct++;
      } else if (q.type === "truefalse" && userAnswer === q.correctAnswer) {
        correct++;
      }
    });

    const passed = correct >= Math.ceil(testQuestions.length * 0.6);

    setTestResults({
      correct,
      total: testQuestions.length,
      passed,
    });

    if (isFinalTest && passed) {
      const saveState = async () => {
        try {
          const res = await api.post("/practice/saveFS", {
            user_id: user.user_id,
            set_id: set_id,
            status: passed,
            order: JSON.stringify(Array.from(order.entries())),
            current_index: currentCard,
          });
        } catch (err) {
          console.log(err);
        }
      };
      saveState();
      setCompletedFinalTest(true);
    }

    if (!isFinalTest) {
      const newCompleted = new Set(completedTests);
      newCompleted.add(currentCard + 1);
      if (passed) {
        setCompletedTests(newCompleted);
      }
    }
    setTestSubmitted(true);
  };

  const continueAfterTest = () => {
    setShowTest(false);
    if (!isFinalTest) {
      setCurrentCard(currentCard + 1);
    }
    setIsFlipped(false);
    setIsFinalTest(false);
  };

  // Test prompt and test screens remain the same...
  if (showTestPrompt) {
    const isAtFinalTest = currentCard === totalCards - 1;
    const testPosition = isAtFinalTest ? "Final" : currentCard + 1;

    return (
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center">
                <button
                  onClick={() => navigate(`/practice/${prof_level}`)}
                  className="flex md:hidden items-center text-slate-600 hover:text-slate-800 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => navigate(`/practice/${prof_level}`)}
                  className="hidden md:flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors z-50 cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span className="font-medium">Back to Chapters</span>
                </button>
              </div>
              <div className="text-center flex-1">
                <h1 className="text-xl md:text-2xl font-bold text-slate-800">
                  {set_name}
                </h1>
                <p className="text-sm text-slate-500">
                  🇩🇪 German • {prof_level?.toUpperCase()} Level
                </p>
              </div>
              <div className="w-5 md:w-32"></div>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 md:px-6 py-12 md:py-20">
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center border-2 border-slate-200">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-slate-500 to-slate-600 rounded-full flex items-center justify-center">
              <Target className="w-10 h-10 text-white" />
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
              {isAtFinalTest ? "Final Assessment Ready!" : "Test Checkpoint!"}
            </h2>

            <p className="text-lg text-slate-600 mb-8">
              {isAtFinalTest
                ? "You've completed all flashcards! Take the final comprehensive test to assess your overall learning."
                : `You've reached card ${testPosition}. Time for a quick test to reinforce your learning!`}
            </p>

            <div className="flex flex-row md:flex-row gap-4 justify-center">
              <button
                onClick={handlePrevious}
                className="px-8 py-4 bg-white text-slate-700 hover:bg-slate-50 rounded-xl shadow-lg hover:shadow-xl transition-all font-semibold border-2 border-slate-200 flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={startTest}
                className="px-8 py-4 bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all font-semibold flex items-center justify-center gap-2"
              >
                {isAtFinalTest ? "Start Final Test" : "Take Test"}
              </button>

              {!isAtFinalTest && (
                <button
                  onClick={skipTest}
                  className="px-8 py-4 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl shadow-lg hover:shadow-xl transition-all font-semibold flex items-center justify-center gap-2"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showTest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-slate-50">
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              {/* Left: Back navigation (responsive) */}
              <div className="flex items-center">
                {/* Mobile chevron */}
                <button
                  onClick={() => navigate(`/practice/${prof_level}`)}
                  className="flex md:hidden items-center text-slate-600 hover:text-slate-800 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Desktop button */}
                <button
                  onClick={() => navigate(`/practice/${prof_level}`)}
                  className="hidden md:flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors z-50 cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span className="font-medium">Back to Chapters</span>
                </button>
              </div>

              {/* Center: Title */}
              <div className="text-center flex-1">
                <h1 className="text-xl md:text-2xl font-bold text-slate-800">
                  {isFinalTest ? " Final Assessment" : "Quick Test"}
                </h1>
                <p className="text-sm text-slate-500">
                  {isFinalTest
                    ? "Comprehensive review of all cards"
                    : `Review Cards ${Math.max(
                        0,
                        currentCard - 19
                      )} - ${currentCard}`}
                </p>
              </div>

              {/* Right: Spacer for symmetry on desktop */}
              <div className="w-5 md:w-32"></div>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
          {!testSubmitted ? (
            <>
              <div
                className={`border-l-4 p-4 mb-6 rounded-lg ${
                  isFinalTest
                    ? "bg-purple-50 border-purple-500"
                    : "bg-amber-50 border-amber-500"
                }`}
              >
                <div className="flex items-start gap-3">
                  <AlertCircle
                    className={`w-5 h-5 mt-0.5 ${
                      isFinalTest ? "text-purple-600" : "text-amber-600"
                    }`}
                  />
                  <div className="flex-1">
                    <h3
                      className={`font-semibold ${
                        isFinalTest ? "text-purple-900" : "text-amber-900"
                      }`}
                    >
                      {isFinalTest ? "Final Test" : "Test Required"}
                    </h3>
                    <p
                      className={`text-sm ${
                        isFinalTest ? "text-purple-700" : "text-amber-700"
                      }`}
                    >
                      {isFinalTest
                        ? `Complete this comprehensive test with ${
                            testQuestions.filter((q) => q.type === "mcq").length
                          } MCQs and ${
                            testQuestions.filter((q) => q.type === "truefalse")
                              .length
                          } True/False questions. You need 60% to pass.`
                        : "Complete this test to continue studying. You need 60% to pass."}
                    </p>
                  </div>
                  {!isFinalTest && (
                    <button
                      onClick={skipTest}
                      className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-all font-medium text-sm flex items-center gap-2 whitespace-nowrap"
                    >
                      Skip Test
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {testQuestions.map((question, qIndex) => (
                <div
                  key={qIndex}
                  className="bg-white rounded-2xl shadow-lg p-6 mb-6"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        question.type === "mcq"
                          ? "bg-cyan-100"
                          : "bg-purple-100"
                      }`}
                    >
                      <span
                        className={`font-bold ${
                          question.type === "mcq"
                            ? "text-cyan-700"
                            : "text-purple-700"
                        }`}
                      >
                        {qIndex + 1}
                      </span>
                    </div>
                    <div className="flex-1">
                      {question.type === "mcq" ? (
                        <>
                          {question.format === "std" ? (
                            <>
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-slate-800">
                                  what does "{question.question}" mean in
                                  German?
                                </h3>
                                <span
                                  className={`text-xs px-2 py-1 rounded-full ${
                                    question.type === "mcq"
                                      ? "bg-cyan-100 text-cyan-700"
                                      : "bg-purple-100 text-purple-700"
                                  }`}
                                >
                                  {question.type === "mcq" ? "MCQ" : "T/F"}
                                </span>
                              </div>
                              <div className="space-y-2">
                                {question.options.map((option, oIndex) => (
                                  <label
                                    key={oIndex}
                                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                      userAnswers[qIndex] === option
                                        ? "border-cyan-500 bg-cyan-50"
                                        : "border-slate-200 hover:border-slate-300"
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`question-${qIndex}`}
                                      value={option}
                                      checked={userAnswers[qIndex] === option}
                                      onChange={() =>
                                        handleTestAnswer(qIndex, option)
                                      }
                                      className="w-4 h-4 text-cyan-600"
                                    />
                                    <span className="text-slate-700">
                                      {option}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-slate-800">
                                  what does "{question.question}" mean in
                                  English?
                                </h3>
                                <span
                                  className={`text-xs px-2 py-1 rounded-full ${
                                    question.type === "mcq"
                                      ? "bg-cyan-100 text-cyan-700"
                                      : "bg-purple-100 text-purple-700"
                                  }`}
                                >
                                  {question.type === "mcq" ? "MCQ" : "T/F"}
                                </span>
                              </div>
                              <div className="space-y-2">
                                {question.options.map((option, oIndex) => (
                                  <label
                                    key={oIndex}
                                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                      userAnswers[qIndex] === option
                                        ? "border-cyan-500 bg-cyan-50"
                                        : "border-slate-200 hover:border-slate-300"
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`question-${qIndex}`}
                                      value={option}
                                      checked={userAnswers[qIndex] === option}
                                      onChange={() =>
                                        handleTestAnswer(qIndex, option)
                                      }
                                      className="w-4 h-4 text-cyan-600"
                                    />
                                    <span className="text-slate-700">
                                      {option}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          {question.format === "std" ? (
                            <>
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-slate-800">
                                  "{question.question}" means "
                                  {question.displayAnswer}" in German.
                                </h3>
                                <span
                                  className={`text-xs px-2 py-1 rounded-full ${
                                    question.type === "mcq"
                                      ? "bg-cyan-100 text-cyan-700"
                                      : "bg-purple-100 text-purple-700"
                                  }`}
                                >
                                  {question.type === "mcq" ? "MCQ" : "T/F"}
                                </span>
                              </div>
                              <div>
                                {/* <p className="text-slate-600 mb-3 italic">"{question.displayAnswer}"</p> */}
                                <div className="flex gap-3 mt-5">
                                  <label
                                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                      userAnswers[qIndex] === true
                                        ? "border-green-500 bg-green-50"
                                        : "border-slate-200 hover:border-slate-300"
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`question-${qIndex}`}
                                      value="true"
                                      checked={userAnswers[qIndex] === true}
                                      onChange={() =>
                                        handleTestAnswer(qIndex, true)
                                      }
                                      className="w-4 h-4 text-green-600"
                                    />
                                    <span className="font-medium text-green-700">
                                      True
                                    </span>
                                  </label>
                                  <label
                                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                      userAnswers[qIndex] === false
                                        ? "border-red-500 bg-red-50"
                                        : "border-slate-200 hover:border-slate-300"
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`question-${qIndex}`}
                                      value="false"
                                      checked={userAnswers[qIndex] === false}
                                      onChange={() =>
                                        handleTestAnswer(qIndex, false)
                                      }
                                      className="w-4 h-4 text-red-600"
                                    />
                                    <span className="font-medium text-red-700">
                                      False
                                    </span>
                                  </label>
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-slate-800">
                                  "{question.question}" means "
                                  {question.displayAnswer}" in English.
                                </h3>
                                <span
                                  className={`text-xs px-2 py-1 rounded-full ${
                                    question.type === "mcq"
                                      ? "bg-cyan-100 text-cyan-700"
                                      : "bg-purple-100 text-purple-700"
                                  }`}
                                >
                                  {question.type === "mcq" ? "MCQ" : "T/F"}
                                </span>
                              </div>
                              <div>
                                {/* <p className="text-slate-600 mb-3 italic">"{question.displayAnswer}"</p> */}
                                <div className="flex gap-3 mt-5">
                                  <label
                                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                      userAnswers[qIndex] === true
                                        ? "border-green-500 bg-green-50"
                                        : "border-slate-200 hover:border-slate-300"
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`question-${qIndex}`}
                                      value="true"
                                      checked={userAnswers[qIndex] === true}
                                      onChange={() =>
                                        handleTestAnswer(qIndex, true)
                                      }
                                      className="w-4 h-4 text-green-600"
                                    />
                                    <span className="font-medium text-green-700">
                                      True
                                    </span>
                                  </label>
                                  <label
                                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                      userAnswers[qIndex] === false
                                        ? "border-red-500 bg-red-50"
                                        : "border-slate-200 hover:border-slate-300"
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`question-${qIndex}`}
                                      value="false"
                                      checked={userAnswers[qIndex] === false}
                                      onChange={() =>
                                        handleTestAnswer(qIndex, false)
                                      }
                                      className="w-4 h-4 text-red-600"
                                    />
                                    <span className="font-medium text-red-700">
                                      False
                                    </span>
                                  </label>
                                </div>
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={submitTest}
                disabled={
                  Object.keys(userAnswers).length !== testQuestions.length
                }
                className={`w-full py-4 rounded-xl font-semibold shadow-lg transition-all ${
                  Object.keys(userAnswers).length !== testQuestions.length
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                }`}
              >
                Submit Test
              </button>
            </>
          ) : (
            <div className="text-center">
              <div
                className={`inline-block p-8 rounded-3xl mb-6 ${
                  testResults.passed ? "bg-green-50" : "bg-red-50"
                }`}
              >
                <div
                  className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4 ${
                    testResults.passed ? "bg-green-100" : "bg-red-100"
                  }`}
                >
                  {testResults.passed ? (
                    <Check className="w-12 h-12 text-green-600" />
                  ) : (
                    <X className="w-12 h-12 text-red-600" />
                  )}
                </div>
                <h2
                  className={`text-3xl font-bold mb-2 ${
                    testResults.passed ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {testResults.passed
                    ? isFinalTest
                      ? "Excellent Work!"
                      : "Great Job!"
                    : "Keep Practicing"}
                </h2>
                <p
                  className={`text-lg ${
                    testResults.passed ? "text-green-600" : "text-red-600"
                  }`}
                >
                  You scored {testResults.correct} out of {testResults.total}
                  <span className="block text-sm mt-1">
                    (
                    {Math.round(
                      (testResults.correct / testResults.total) * 100
                    )}
                    %)
                  </span>
                </p>
              </div>

              {testResults.passed ? (
                <div className="space-y-3">
                  <button
                    onClick={continueAfterTest}
                    className="w-full px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all font-semibold"
                  >
                    {isFinalTest
                      ? "Complete Study Session"
                      : "Continue Studying"}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center space-y-3">
                  <button
                    onClick={() => {
                      setTestSubmitted(false);
                      setUserAnswers({});
                    }}
                    className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all font-semibold"
                  >
                    Retry Test
                  </button>
                  {!isFinalTest && (
                    <button
                      onClick={skipTest}
                      className="px-8 py-4 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl shadow-lg hover:shadow-xl transition-all font-semibold flex items-center justify-center gap-2"
                    >
                      Skip and Keep Practicing
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-slate-50">
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center">
              <button
                onClick={() => navigate(`/practice/${prof_level}`)}
                className="flex md:hidden items-center text-slate-600 hover:text-slate-800 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate(`/practice/${prof_level}`)}
                className="hidden md:flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors z-50 cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="font-medium">Back to Chapters</span>
              </button>
            </div>
            <div className="text-center flex-1">
              <h1 className="text-xl md:text-2xl font-bold text-slate-800">
                {set_name}
              </h1>
              <p className="text-sm text-slate-500">
                🇩🇪 German • {prof_level?.toUpperCase()} Level
              </p>
            </div>
            <div className="w-5 md:w-32"></div>
          </div>
        </div>
      </header>

      <div className=" pl-10 pr-10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">
              Card {currentCard + 1} of {totalCards}
            </span>
          </div>
          <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-visible">
            <div
              className="h-full bg-gradient-to-r from-slate-700 to-slate-800 rounded-full transition-all duration-300"
              style={{ width: `${Progress}%` }}
            ></div>

            {testBreakpoints.map((breakpoint) => {
              const position = (breakpoint / totalCards) * 100;
              const status = getTestStatus(breakpoint);
              return (
                <div
                  key={breakpoint}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                  style={{ left: `${position}%` }}
                >
                  <div
                    className={`w-6 h-6 rounded-full  flex items-center justify-center ${
                      status === "completed" ? "bg-green-500 " : "bg-white "
                    }`}
                  >
                    {status === "completed" ? (
                      <Check className="w-3 h-3 text-white" />
                    ) : (
                      <Target className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                  {/* <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="text-xs text-slate-500 font-medium">{breakpoint}</span>
                  </div> */}
                </div>
              );
            })}

            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
              style={{ left: "100%" }}
            >
              <div
                className={`w-7 h-7 rounded-full  ${
                  completedFinalTest === true
                    ? "bg-green-500 "
                    : "bg-amber-500 "
                }  flex items-center justify-center`}
                onClick={handleTestClick}
              >
                {completedFinalTest === true ? (
                  <Check className="w-3 h-3 text-white" />
                ) : (
                  <Target className="w-4 h-4 text-white" />
                )}
              </div>
              {/* <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className="text-xs text-amber-600 font-bold">Final</span>
              </div> */}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* Flashcard with Swipe Animation */}
        <div className="mb-8 space-y-8">
          <div
            className="relative w-full h-[400px] md:h-[500px] cursor-pointer"
            onMouseDown={handleDragStart}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={handleDragStart}
            onTouchMove={handleDragMove}
            onTouchEnd={handleDragEnd}
            onClick={handleCardFlip}
            style={{
              transform: getCardTransform(),
              opacity: swipeDirection ? 0 : 1,
              transition: isDragging ? "none" : "all 0.3s ease-out",
            }}
          >
            {/* Swipe Direction Indicators */}
            {isDragging && dragOffset > 50 && (
              <div className="absolute top-8 right-8 bg-blue-500 text-white px-6 py-3 rounded-full font-bold text-xl shadow-lg pointer-events-none z-30">
                PREVIOUS
              </div>
            )}
            {isDragging && dragOffset < -50 && (
              <div className="absolute top-8 left-8 bg-green-500 text-white px-6 py-3 rounded-full font-bold text-xl shadow-lg pointer-events-none z-30">
                NEXT
              </div>
            )}

            {/* Front of Card */}
            <div
              className={`absolute inset-0 transition-all duration-500 ${
                isFlipped
                  ? "opacity-0 pointer-events-none rotate-y-180"
                  : "opacity-100"
              }`}
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="h-full bg-white rounded-3xl shadow-2xl p-12 flex flex-col items-center justify-center border-4 border-slate-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-100 rounded-full -translate-y-16 translate-x-16 opacity-50"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-100 rounded-full translate-y-20 -translate-x-20 opacity-50"></div>

                <button
                  onClick={handleSpeakFront}
                  disabled={isLoadingAudio || isSpeaking}
                  className={`absolute top-6 right-6 p-3 rounded-full shadow-lg transition-all z-20 ${
                    isSpeaking || isLoadingAudio
                      ? "bg-cyan-600 text-white animate-pulse"
                      : "bg-white text-cyan-600 hover:bg-cyan-50 cursor-pointer"
                  }`}
                  title="Pronounce question"
                >
                  {isLoadingAudio ? (
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>

                <div className="relative z-10 w-full">
                  <div className="text-2xl md:text-4xl font-bold text-slate-800 text-center mb-8">
                    {flashcardSet[currentCard]?.front_content}
                  </div>
                  <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
                    <RotateCw className="w-4 h-4" />
                    <span>Click to reveal answer</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Back of Card */}
            <div
              className={`absolute inset-0 transition-all duration-500 ${
                isFlipped
                  ? "opacity-100"
                  : "opacity-0 pointer-events-none -rotate-y-180"
              }`}
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="h-full bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 rounded-3xl shadow-2xl p-12 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-48 h-48 bg-white/10 rounded-full -translate-y-24 -translate-x-24"></div>
                <div className="absolute bottom-0 right-0 w-56 h-56 bg-white/10 rounded-full translate-y-28 translate-x-28"></div>

                <button
                  onClick={handleSpeakBack}
                  disabled={isLoadingAudio || isSpeaking}
                  className={`absolute top-6 right-6 p-3 rounded-full shadow-lg transition-all z-20 ${
                    isSpeaking || isLoadingAudio
                      ? "bg-white text-amber-600 animate-pulse"
                      : "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm cursor-pointer"
                  }`}
                  title="Pronounce answer"
                >
                  {isLoadingAudio ? (
                    <div className="animate-spin h-5 w-5 border-2 border-t-transparent rounded-full" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>

                <div className="relative z-10 w-full">
                  <div className="text-3xl md:text-5xl font-bold text-white text-center mb-8 drop-shadow-lg">
                    {flashcardSet[currentCard]?.back_content}
                  </div>
                  <div className="flex items-center justify-center gap-2 text-amber-100 text-sm">
                    <RotateCw className="w-4 h-4" />
                    <span>Click to see question</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 md:gap-4 mb-8">
            <button
              onClick={handlePrevious}
              disabled={currentCard === 0 && !showTestPrompt}
              className={`p-3 md:p-4 rounded-xl transition-all ${
                currentCard === 0 && !showTestPrompt
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-white text-slate-700 hover:bg-slate-50 shadow-lg hover:shadow-xl"
              }`}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleShuffle}
                className="px-4 md:px-6 py-3 md:py-4 bg-white text-slate-700 hover:bg-slate-50 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 font-medium text-sm md:text-base"
              >
                <Shuffle className="w-5 h-5" />
                Shuffle
              </button>

              <button
                onClick={handleReset}
                className="px-4 md:px-6 py-3 md:py-4 bg-white text-slate-700 hover:bg-slate-50 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 font-medium text-sm md:text-base"
              >
                <RotateCw className="w-5 h-5" />
                Reset
              </button>
            </div>

            <button
              onClick={handleNext}
              className="p-3 md:p-4 rounded-xl transition-all bg-white text-slate-700 hover:bg-slate-50 shadow-lg hover:shadow-xl"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlashcardStudyPage;
