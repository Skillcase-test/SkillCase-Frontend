export const TOUR_PAGES = {
  LANDING: "landing",
  FLASHCARD_SELECT: "flashcard_select",
  FLASHCARD_PRACTICE: "flashcard_practice",
  PRONOUNCE_SELECT: "pronounce_select",
  PRONOUNCE_PRACTICE: "pronounce_practice",
  LISTENER: "listener",
  LISTENER_VIEW: "listener_view",
  STORIES: "stories",
  STORY_VIEW: "story_view",
  COMPLETE: "complete",
};

// SVG icons as HTML strings for use in Driver.js (which supports HTML)
const ICONS = {
  wave: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#002856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7l9-4 9 4"/></svg>`,
  book: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#002856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>`,
  mic: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#002856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>`,
  headphones: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#002856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></svg>`,
  bookOpen: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#002856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
  fileText: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#002856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/></svg>`,
  flame: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
  tap: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#002856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>`,
  check: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#019035" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
};

export const getLandingSteps = (onSkip) => [
  {
    popover: {
      title: "Welcome to Skillcase!",
      description:
        "Let's take a quick tour to help you learn German effectively.",
      showButtons: ["next", "close"],
      nextBtnText: "Start Tour",
      onCloseClick: onSkip,
    },
  },
  {
    element: "#feature-cards-grid",
    popover: {
      title: "Your Learning Tools",
      description:
        "Here are all the features to help you master German. Let's explore each one!",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: "#flashcard-card",
    popover: {
      title: `${ICONS.book} Flashcards`,
      description:
        "Master German vocabulary with interactive cards. Flip to learn new words!",
      popoverClass: "centered-popover popover-bottom",
    },
  },
  {
    element: "#pronunciation-card",
    popover: {
      title: `${ICONS.mic} Pronunciation`,
      description: "Perfect your German pronunciation with audio exercises.",
      popoverClass: "centered-popover popover-bottom",
    },
  },
  {
    element: "#test-card",
    popover: {
      title: `${ICONS.fileText} Tests`,
      description: "Track your progress with chapter tests after learning.",
      popoverClass: "centered-popover popover-bottom",
    },
  },
  {
    element: "#listener-card",
    popover: {
      title: `${ICONS.headphones} Listener`,
      description: "Improve listening skills with real German conversations.",
      popoverClass: "centered-popover popover-top",
    },
  },
  {
    element: "#stories-card",
    popover: {
      title: `${ICONS.bookOpen} Stories`,
      description: "Read short German stories to build comprehension.",
      popoverClass: "centered-popover popover-top",
    },
  },
  {
    element: "#streak-widget",
    popover: {
      title: `${ICONS.flame} Daily Streak`,
      description:
        "Practice 20 flashcards daily to build your streak! Consistency is key to learning.",
      side: "top",
    },
  },
  {
    element: "#flashcard-card",
    popover: {
      title: "Let's Try Flashcards!",
      description: "Click 'Try Now' to open flashcards.",
      side: "bottom",
      showButtons: ["next"],
      nextBtnText: "Try Now →",
    },
  },
];

export const getFlashcardSelectSteps = () => [
  {
    element: "#chapter-list",
    popover: {
      title: "Learning Chapters",
      description: "Each chapter includes topic-wise flashcards.",
      side: "bottom",
    },
  },
  {
    element: "#first-chapter",
    popover: {
      title: "Try This Chapter",
      description: "Click the chapter card to open it.",
      side: "bottom",
      showButtons: [],
    },
  },
];

export const getFlashcardPracticeSteps = () => [
  {
    element: "#flashcard-container",
    popover: {
      title: `${ICONS.tap} Tap the Card!`,
      description:
        "Tap the card to see the German translation. An overlay button will guide you.",
      popoverClass: "practice-card-popover",
      side: "top",
      showButtons: ["close"],
    },
  },
];

export const getPronounceSelectSteps = () => [
  {
    element: "#pronounce-list",
    popover: {
      title: "Pronunciation Exercises",
      description: "Practice speaking German with these audio exercises.",
      side: "bottom",
    },
  },
  {
    element: "#first-pronounce",
    popover: {
      title: "Try This One",
      description: "Click the card to start practicing.",
      side: "bottom",
      showButtons: ["close"],
    },
  },
];

export const getPronouncePracticeSteps = () => [
  {
    element: "#pronounce-container",
    popover: {
      title: `${ICONS.mic} Practice Pronunciation`,
      description:
        "Follow the interactive buttons on the card to practice. First listen, then record!",
      popoverClass: "practice-card-popover",
      side: "top",
      showButtons: ["close"],
    },
  },
];

export const getTestsSteps = () => [
  {
    element: "#test-card",
    popover: {
      title: `${ICONS.fileText} Tests`,
      description: "Take chapter tests to test your knowledge!",
      popoverClass: "centered-popover popover-bottom",
      showButtons: ["next"],
      nextBtnText: "Continue Tour",
    },
  },
];

export const getStoriesSteps = () => [
  {
    element: "#first-story",
    popover: {
      title: `${ICONS.bookOpen} Read a Story`,
      description:
        "Click on this story to start reading and improve your comprehension.",
      side: "bottom",
      showButtons: ["close"],
    },
  },
];

export const getStoryViewSteps = () => [
  {
    element: "#story-article",
    popover: {
      title: `${ICONS.bookOpen} Read the Story in German`,
      description:
        "Read through the story. German words are highlighted with their meanings.",
      side: "top",
      showButtons: ["next"],
      nextBtnText: "Done Reading",
    },
  },
];

export const getListenerSteps = () => [
  {
    element: "#first-conversation",
    popover: {
      title: `${ICONS.headphones} Listen to a Conversation`,
      description:
        "Click on this conversation to practice your listening skills.",
      side: "bottom",
      showButtons: ["close"],
    },
  },
];

export const getListenerViewSteps = () => [
  {
    element: "#play-button",
    popover: {
      title: `${ICONS.headphones} Press Play`,
      description:
        "Click the Play button to start listening to the conversation.",
      side: "top",
      showButtons: [],
    },
  },
  {
    popover: {
      title: "Free Exploration Mode",
      description:
        "You now have full control! Interact with the player 3 times (Play, Pause, or Tap Sentences) to continue.",
      side: "top",
      align: "center",
      showButtons: ["next"],
      nextBtnText: "Start Exploring",
    },
  },
];

export const getCompletionStep = () => [
  {
    popover: {
      title: `${ICONS.check} Tour Complete!`,
      description:
        "You're all set to start learning German. Good luck on your journey!",
      showButtons: ["next"],
      nextBtnText: "Start Learning",
      popoverClass: "completion-popover",
    },
  },
];
