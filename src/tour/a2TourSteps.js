// A2 Tour Step Definitions
// Each feature tour is independent

// SVG icons as HTML strings for Driver.js popovers
const ICONS = {
  book: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#002856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>`,
  grammar: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#002856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
  headphones: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#002856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></svg>`,
  mic: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#002856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>`,
  bookOpen: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#002856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
  fileText: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#002856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/></svg>`,
  flame: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
  tap: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#002856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>`,
  check: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#019035" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
};

// ========== LANDING PAGE TOUR ==========
export const getA2LandingSteps = (onSkip) => [
  {
    popover: {
      title: "Welcome to A2 Level! 🎉",
      description:
        "You've reached A2! Let's explore your new learning tools designed for intermediate German.",
      showButtons: ["next", "close"],
      nextBtnText: "Start Tour",
      onCloseClick: onSkip,
    },
  },
  {
    element: "#a2-feature-cards-grid",
    popover: {
      title: "Your A2 Learning Tools",
      description:
        "Here are the features designed for your A2 level. Let's explore each one!",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: "#a2-flashcard-card",
    popover: {
      title: `${ICONS.book} Flashcards`,
      description:
        "Learn advanced vocabulary with word-sentence flashcards. Flip cards to see examples!",
      popoverClass: "centered-popover popover-bottom",
    },
  },
  {
    element: "#a2-grammar-card",
    popover: {
      title: `${ICONS.grammar} Grammar`,
      description:
        "Master German grammar rules with explanations and interactive practice exercises.",
      popoverClass: "centered-popover popover-bottom",
    },
  },
  {
    element: "#a2-listening-card",
    popover: {
      title: `${ICONS.headphones} Listening`,
      description:
        "Improve your comprehension with audio exercises, subtitles, and comprehension questions.",
      popoverClass: "centered-popover popover-bottom",
    },
  },
  {
    element: "#a2-speaking-card",
    popover: {
      title: `${ICONS.mic} Speaking`,
      description:
        "Practice pronunciation by recording yourself and getting instant feedback scores.",
      popoverClass: "centered-popover popover-top",
    },
  },
  {
    element: "#a2-reading-card",
    popover: {
      title: `${ICONS.bookOpen} Reading`,
      description:
        "Read German texts -> emails, messages, articles, sms and test your comprehension with quizzes.",
      popoverClass: "centered-popover popover-top",
    },
  },
  {
    element: "#a2-test-card",
    popover: {
      title: `${ICONS.fileText} Test`,
      description:
        "Challenge yourself with 5-level tests on each topic. Complete all levels to master it!",
      popoverClass: "centered-popover popover-top",
    },
  },
  {
    element: "#streak-widget",
    popover: {
      title: `${ICONS.flame} Your Daily Streak`,
      description:
        "Keep your learning streak alive! Practice daily to build consistency and track your progress here.",
      side: "top",
    },
  },
  {
    popover: {
      title: `${ICONS.tap} Explore a Feature!`,
      description:
        "The tour will continue when you click on any feature card. Each feature has its own guided walkthrough!",
      showButtons: ["next"],
      nextBtnText: "Got it! ✓",
      popoverClass: "completion-popover",
    },
  },
];

// ========== FLASHCARD TOUR ==========
export const getA2FlashcardSelectSteps = () => [
  {
    element: "#a2-chapter-list",
    popover: {
      title: `${ICONS.book} Learning Chapters`,
      description:
        "Each chapter covers a specific topic with vocabulary flashcards. Your progress is tracked per chapter.",
      side: "bottom",
    },
  },
  {
    element: "#a2-first-chapter",
    isTapStep: true,
    popover: {
      title: `${ICONS.tap} Try This Chapter`,
      description: "Tap on this chapter to start learning!",
      side: "bottom",
      showButtons: [],
    },
  },
];

export const getA2FlashcardPracticeSteps = () => [
  {
    element: "#flashcard-container",
    isTapStep: true,
    popover: {
      title: `${ICONS.tap} Tap the Card!`,
      description:
        "Tap the card to flip it and see the German sentence example.",
      popoverClass: "practice-card-popover",
      side: "top",
      showButtons: ["close"],
    },
  },
];

// ========== GRAMMAR TOUR ==========
export const getA2GrammarSelectSteps = () => [
  {
    element: "#a2-chapter-list",
    popover: {
      title: `${ICONS.grammar} Grammar Chapters`,
      description:
        "Each chapter covers a specific grammar topic. Your progress is tracked per chapter.",
      side: "bottom",
    },
  },
  {
    element: "#a2-first-chapter",
    isTapStep: true,
    popover: {
      title: `${ICONS.tap} Try This Chapter`,
      description: "Tap on this chapter to start learning!",
      side: "bottom",
      showButtons: [],
    },
  },
];

export const getA2GrammarExplanationSteps = () => [
  {
    element: "#a2-grammar-content",
    popover: {
      title: `${ICONS.grammar} Grammar Explanation`,
      description:
        "Read through the grammar rules and examples. Tables and examples make learning easier!",
      side: "bottom",
    },
  },
  {
    element: "#a2-grammar-start-practice",
    isTapStep: true,
    popover: {
      title: `${ICONS.tap} Start Practicing!`,
      description:
        'Click "Start Practice" to test your understanding with interactive questions.',
      side: "top",
      showButtons: [],
    },
  },
];

// ========== LISTENING TOUR (combined layout) ==========
export const getA2ListeningSelectSteps = () => [
  {
    element: "#a2-chapter-list",
    popover: {
      title: `${ICONS.headphones} Listening Chapters`,
      description:
        "Each chapter has audio exercises to improve your comprehension. Your progress is tracked per chapter.",
      side: "bottom",
    },
  },
  {
    element: "#a2-first-chapter",
    isTapStep: true,
    popover: {
      title: `${ICONS.tap} Try This Chapter`,
      description: "Tap on this chapter to start listening practice!",
      side: "bottom",
      showButtons: [],
    },
  },
];

export const getA2ListeningSteps = () => [
  {
    element: "#a2-listening-play-btn",
    popover: {
      title: `${ICONS.headphones} Audio Player`,
      description:
        "This is the audio player. Listen to the audio to improve your comprehension.",
      side: "bottom",
    },
  },
  {
    element: "#a2-listening-subtitle-btn",
    isTapStep: true,
    popover: {
      title: `${ICONS.tap} Show Subtitles`,
      description: "Tap here to toggle subtitles while listening.",
      side: "bottom",
      showButtons: [],
    },
  },
];

export const getA2ListeningAfterSubtitleSteps = () => [
  {
    element: "#a2-listening-subtitles-area",
    popover: {
      title: `${ICONS.headphones} Karaoke Subtitles`,
      description:
        "Swipe up/down to navigate through subtitles. Tap any line to jump to that part!",
      side: "top",
    },
  },
  {
    element: "#a2-listening-questions-section",
    popover: {
      title: `${ICONS.check} Answer Questions`,
      description:
        "Answer these comprehension questions based on the audio. Good luck!",
      side: "top",
      showButtons: ["next"],
      nextBtnText: "Got it! ✓",
    },
  },
];

// ========== SPEAKING TOUR ==========
export const getA2SpeakingSelectSteps = () => [
  {
    element: "#a2-chapter-list",
    popover: {
      title: `${ICONS.mic} Speaking Chapters`,
      description:
        "Each chapter has speaking exercises to practice pronunciation. Your progress is tracked per chapter.",
      side: "bottom",
    },
  },
  {
    element: "#a2-first-chapter",
    isTapStep: true,
    popover: {
      title: `${ICONS.tap} Try This Chapter`,
      description: "Tap on this chapter to start speaking practice!",
      side: "bottom",
      showButtons: [],
    },
  },
];

export const getA2SpeakingCardSteps = () => [
  {
    element: "#a2-speaking-container",
    popover: {
      title: `${ICONS.mic} Speaking Practice`,
      description:
        "Practice your pronunciation! Read the German text, then record yourself saying it.",
      popoverClass: "practice-card-popover",
      side: "top",
    },
  },
];

// ========== READING TOUR ==========
export const getA2ReadingSelectSteps = () => [
  {
    element: "#a2-chapter-list",
    popover: {
      title: `${ICONS.bookOpen} Reading Chapters`,
      description:
        "Each chapter has reading texts and comprehension exercises. Your progress is tracked per chapter.",
      side: "bottom",
    },
  },
  {
    element: "#a2-first-chapter",
    isTapStep: true,
    popover: {
      title: `${ICONS.tap} Try This Chapter`,
      description: "Tap on this chapter to start reading practice!",
      side: "bottom",
      showButtons: [],
    },
  },
];

export const getA2ReadingSteps = () => [
  {
    element: "#a2-reading-content",
    popover: {
      title: `${ICONS.bookOpen} Read the Content`,
      description:
        "Read the German text carefully. Tap highlighted words to see their meanings!",
      side: "bottom",
    },
  },
  {
    element: "#a2-reading-quiz-btn",
    isTapStep: true,
    popover: {
      title: `${ICONS.tap} Take the Quiz`,
      description: "Test your comprehension by taking the quiz!",
      side: "top",
      showButtons: [],
    },
  },
];

// ========== TEST TOUR ==========
export const getA2TestSelectSteps = () => [
  {
    element: "#a2-first-chapter",
    isTapStep: true,
    popover: {
      title: `${ICONS.tap} Choose a Chapter`,
      description: "Tap on a chapter to start testing your knowledge!",
      side: "bottom",
      showButtons: [],
    },
  },
];

export const getA2TestPrerequisiteSteps = () => [
  {
    element: "#a2-test-prerequisite-modal",
    popover: {
      title: `${ICONS.fileText} Prerequisites`,
      description:
        "These are topics you should learn before attempting this test for the best experience.",
      side: "bottom",
      popoverClass: "centered-popover popover-bottom",
    },
  },
  {
    element: "#a2-test-got-it-btn",
    isTapStep: true,
    popover: {
      title: `${ICONS.tap} Got it!`,
      description: 'Tap "Got it!" to continue to the test levels.',
      side: "top",
      showButtons: [],
    },
  },
];

export const getA2TestLevelSteps = () => [
  {
    element: "#a2-test-levels",
    popover: {
      title: `${ICONS.fileText} Five Levels`,
      description:
        "Each topic has 5 levels of increasing difficulty. Complete each level to unlock the next!",
      side: "bottom",
      showButtons: ["next"],
      nextBtnText: "Got it! ✓",
    },
  },
];
