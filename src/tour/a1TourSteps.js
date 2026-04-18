const ICONS = {
  book: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#002856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>`,
  grammar: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#002856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
  headphones: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#002856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></svg>`,
  mic: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#002856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>`,
  bookOpen: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#002856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
  fileText: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#002856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/></svg>`,
  newspaper: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#002856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M4 5h16a1 1 0 0 1 1 1v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5z"/><path d="M8 9h8"/><path d="M8 13h8"/><path d="M8 17h5"/></svg>`,
  flame: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
  tap: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#002856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>`,
  check: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#019035" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
};

export const getA1LandingSteps = (onSkip) => [
  {
    popover: {
      title: "Welcome to A1!",
      description:
        "Let's quickly walk through the redesigned A1 modules so you can start learning faster.",
      showButtons: ["next", "close"],
      nextBtnText: "Start Tour",
      onCloseClick: onSkip,
    },
  },
  {
    element: "#feature-cards-grid",
    popover: {
      title: "Your A1 Learning Hub",
      description:
        "These cards are your core A1 modules. We will guide you through each one.",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: "#a1-revamp-flashcard-card",
    popover: {
      title: `${ICONS.book} Flashcards`,
      description:
        "Build vocabulary with image-first cards and quick checkpoint quizzes.",
      popoverClass: "centered-popover popover-bottom",
    },
  },
  {
    element: "#a1-revamp-grammar-card",
    popover: {
      title: `${ICONS.grammar} Grammar`,
      description:
        "Learn grammar chapter by chapter and practice interactively.",
      popoverClass: "centered-popover popover-bottom",
    },
  },
  {
    element: "#a1-revamp-listening-card",
    popover: {
      title: `${ICONS.headphones} Listening`,
      description:
        "Practice listening with guided audio and comprehension questions.",
      popoverClass: "centered-popover popover-bottom",
    },
  },
  {
    element: "#a1-revamp-speaking-card",
    popover: {
      title: `${ICONS.mic} Speaking`,
      description: "Record your voice and get instant pronunciation feedback.",
      popoverClass: "centered-popover popover-top",
    },
  },
  {
    element: "#a1-revamp-reading-card",
    popover: {
      title: `${ICONS.bookOpen} Reading`,
      description: "Read A1 texts and test understanding with quizzes.",
      popoverClass: "centered-popover popover-top",
    },
  },
  {
    element: "#a1-revamp-test-card",
    popover: {
      title: `${ICONS.fileText} Test`,
      description: "Challenge yourself with level-based tests for each topic.",
      popoverClass: "centered-popover popover-top",
    },
  },
  {
    element: "#news-card",
    popover: {
      title: `${ICONS.newspaper} News`,
      description: "Read real-world headlines in German and English.",
      popoverClass: "centered-popover popover-top",
    },
  },
  {
    element: "#streak-widget",
    popover: {
      title: `${ICONS.flame} Daily Streak`,
      description: "Keep your streak alive by practicing a little every day.",
      side: "top",
    },
  },
  {
    popover: {
      title: `${ICONS.tap} Open any Module`,
      description:
        "Tap any module card. The tour will guide you inside that module. Lets go!",
      showButtons: ["next"],
      nextBtnText: "Got it",
      popoverClass: "completion-popover",
    },
  },
];

export const getA1FlashcardSelectSteps = () => [
  {
    element: "#A1-chapter-list",
    popover: {
      title: `${ICONS.book} Flashcard Chapters`,
      description: "Your flashcard progress is tracked chapter-wise.",
      side: "bottom",
    },
  },
  {
    element: "#A1-first-chapter",
    isTapStep: true,
    popover: {
      title: `${ICONS.tap} Start Here`,
      description: "Tap this chapter to start your flashcard practice.",
      side: "bottom",
      showButtons: [],
    },
  },
];

export const getA1FlashcardPracticeSteps = () => [
  {
    element: "#A1-flashcard-container",
    isTapStep: true,
    popover: {
      title: `${ICONS.tap} Flip the Card`,
      description: "Tap the card to reveal the example and complete this step.",
      popoverClass: "practice-card-popover",
      side: "top",
      showButtons: ["close"],
    },
  },
];

export const getA1GrammarSelectSteps = () => [
  {
    element: "#A1-chapter-list",
    popover: {
      title: `${ICONS.grammar} Grammar Chapters`,
      description: "Choose a chapter to start grammar learning.",
      side: "bottom",
    },
  },
  {
    element: "#A1-first-chapter",
    isTapStep: true,
    popover: {
      title: `${ICONS.tap} Try This Chapter`,
      description: "Tap to open your first grammar chapter.",
      side: "bottom",
      showButtons: [],
    },
  },
];

export const getA1GrammarExplanationSteps = () => [
  {
    element: "#A1-grammar-content",
    popover: {
      title: `${ICONS.grammar} Explanation`,
      description: "Read examples and rules before you start practice.",
      side: "bottom",
    },
  },
  {
    element: "#A1-grammar-start-practice",
    isTapStep: true,
    popover: {
      title: `${ICONS.tap} Start Practice`,
      description: "Tap this button to begin solving grammar questions.",
      side: "top",
      showButtons: [],
    },
  },
];

export const getA1ListeningSelectSteps = () => [
  {
    element: "#A1-chapter-list",
    popover: {
      title: `${ICONS.headphones} Listening Chapters`,
      description: "Each chapter contains listening tasks and question sets.",
      side: "bottom",
    },
  },
  {
    element: "#A1-first-chapter",
    isTapStep: true,
    popover: {
      title: `${ICONS.tap} Open Chapter`,
      description: "Tap this chapter to start listening practice.",
      side: "bottom",
      showButtons: [],
    },
  },
];

export const getA1ListeningSteps = () => [
  {
    element: "#A1-listening-play-btn",
    popover: {
      title: `${ICONS.headphones} Audio Player`,
      description: "Play the audio and follow along.",
      side: "bottom",
    },
  },
  {
    element: "#A1-listening-subtitle-btn",
    isTapStep: true,
    popover: {
      title: `${ICONS.tap} Show Subtitles`,
      description: "Tap here to reveal karaoke subtitles.",
      side: "bottom",
      showButtons: [],
    },
  },
];

export const getA1ListeningAfterSubtitleSteps = () => [
  {
    element: "#A1-listening-subtitles-area",
    popover: {
      title: `${ICONS.headphones} Karaoke View`,
      description: "Use swipe or wheel to move across subtitle lines.",
      side: "top",
    },
  },
  {
    element: "#A1-listening-questions-section",
    popover: {
      title: `${ICONS.check} Questions`,
      description: "Answer these to check listening comprehension.",
      side: "top",
      showButtons: ["next"],
      nextBtnText: "Got it",
    },
  },
];

export const getA1SpeakingSelectSteps = () => [
  {
    element: "#A1-chapter-list",
    popover: {
      title: `${ICONS.mic} Speaking Chapters`,
      description: "Open a chapter and practice pronunciation card by card.",
      side: "bottom",
    },
  },
  {
    element: "#A1-first-chapter",
    isTapStep: true,
    popover: {
      title: `${ICONS.tap} Start Speaking`,
      description: "Tap this chapter to enter speaking practice.",
      side: "bottom",
      showButtons: [],
    },
  },
];

export const getA1SpeakingCardSteps = () => [
  {
    element: "#A1-speaking-container",
    popover: {
      title: `${ICONS.mic} Speaking Practice`,
      description: "Read the prompt, record your voice, and review your score.",
      popoverClass: "practice-card-popover",
      side: "top",
    },
  },
];

export const getA1ReadingSelectSteps = () => [
  {
    element: "#A1-chapter-list",
    popover: {
      title: `${ICONS.bookOpen} Reading Chapters`,
      description: "Choose a chapter and practice reading comprehension.",
      side: "bottom",
    },
  },
  {
    element: "#A1-first-chapter",
    isTapStep: true,
    popover: {
      title: `${ICONS.tap} Open Chapter`,
      description: "Tap to begin reading practice.",
      side: "bottom",
      showButtons: [],
    },
  },
];

export const getA1ReadingSteps = () => [
  {
    element: "#A1-reading-content",
    popover: {
      title: `${ICONS.bookOpen} Read Carefully`,
      description: "Read the content and tap highlighted words for meaning.",
      side: "bottom",
    },
  },
  {
    element: "#A1-reading-questions",
    popover: {
      title: `${ICONS.check} Questions Section`,
      description:
        "Answer the reading questions below, then submit when ready.",
      side: "top",
      showButtons: ["next"],
      nextBtnText: "Done",
    },
  },
];

export const getA1NewsListSteps = () => [
  {
    element: "#A1-news-list",
    popover: {
      title: `${ICONS.newspaper} News Reel`,
      description: "Swipe up/down to move between the latest articles.",
      side: "top",
    },
  },
  {
    element: "#A1-news-language-toggle",
    popover: {
      title: `${ICONS.tap} Language Toggle`,
      description: "Switch quickly between German and English.",
      side: "bottom",
      showButtons: ["next"],
      nextBtnText: "Got it",
    },
  },
];

export const getA1TestSelectSteps = () => [
  {
    element: "#A1-first-chapter",
    isTapStep: true,
    popover: {
      title: `${ICONS.tap} Pick a Chapter`,
      description: "Tap a chapter to open its level-based tests.",
      side: "bottom",
      showButtons: [],
    },
  },
];

export const getA1TestPrerequisiteSteps = () => [
  {
    element: "#A1-test-prerequisite-modal",
    popover: {
      title: `${ICONS.fileText} Prerequisites`,
      description: "These are recommended topics before this test.",
      side: "bottom",
      popoverClass: "centered-popover popover-bottom",
    },
  },
  {
    element: "#A1-test-got-it-btn",
    isTapStep: true,
    popover: {
      title: `${ICONS.tap} Continue`,
      description: "Tap this button to continue to test levels.",
      side: "top",
      showButtons: [],
    },
  },
];

export const getA1TestLevelSteps = () => [
  {
    element: "#A1-test-levels",
    popover: {
      title: `${ICONS.fileText} 5 Test Levels`,
      description: "Complete levels progressively to finish the topic.",
      side: "bottom",
      showButtons: ["next"],
      nextBtnText: "Got it",
    },
  },
];
