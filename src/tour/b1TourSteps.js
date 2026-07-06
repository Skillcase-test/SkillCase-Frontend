const ICONS = {
  book: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#002856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>`,
  headphones: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#002856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></svg>`,
  mic: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#002856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>`,
  fileText: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#002856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/></svg>`,
  sparkles: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#002856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"/></svg>`,
  flame: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
  tap: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#002856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>`,
  check: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#019035" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
};

export const getB1LandingSteps = (onSkip) => [
  {
    popover: {
      title: "Welcome to B1 German!",
      description:
        "Let's explore your B1 features to help you master advanced topics.",
      showButtons: ["next", "close"],
      nextBtnText: "Start Tour",
      onCloseClick: onSkip,
    },
  },
  {
    element: "#b1-feature-cards-grid",
    popover: {
      title: "B1 Feature Grid",
      description:
        "These modules are designed for intermediate B1 candidates. Let's look at each section.",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: "#b1-flashcard-card",
    popover: {
      title: `${ICONS.book} Flashcards`,
      description:
        "Expand your German vocabulary database with intermediate word decks and checkpoint tests.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#b1-read-listen-card",
    popover: {
      title: `${ICONS.headphones} Reading & Listening`,
      description:
        "Read real B1 articles, stream audio passages, and solve text-comprehension questions.",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: "#b1-describe-speak-card",
    popover: {
      title: `${ICONS.mic} Describe & Speak`,
      description:
        "Practice explaining advanced image prompts and checking pronunciation feedback.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: "#b1-exams-card",
    popover: {
      title: `${ICONS.fileText} Exam Papers`,
      description: "Attempt Sample Goethe or TELC papers.",
      side: "top",
      align: "start",
    },
  },
  {
    element: "#b1-maya-card",
    popover: {
      title: `${ICONS.sparkles} Talk to Maya`,
      description:
        "Engage in natural German conversations with Maya, your personal AI study partner.",
      side: "left",
      align: "center",
      popoverClass: "no-arrow-popover",
    },
  },
  {
    element: "#b1-news-card",
    popover: {
      title: `${ICONS.headphones} News`,
      description:
        "Read top headlines in German and English to build daily reading confidence.",
      side: "top",
      align: "end",
    },
  },

  {
    element: "#streak-widget",
    popover: {
      title: `${ICONS.flame} Daily Habit`,
      description:
        "Practice every day to maintain your streak and keep your German strong.",
      side: "top",
    },
  },
  {
    element: "#support-widget-trigger",
    popover: {
      title: `${ICONS.tap} Support`,
      description:
        "Use this help button when you need support or want to share an issue with the team.",
      side: "left",
      align: "center",
    },
  },
  {
    popover: {
      title: `${ICONS.tap} Start Practicing`,
      description:
        "Tap a module card to continue the guided onboarding inside that feature.",
      showButtons: ["next"],
      nextBtnText: "Got it",
      popoverClass: "completion-popover",
    },
  },
];

export const getB1FlashcardSelectSteps = () => [
  {
    element: "#b1-chapter-list",
    popover: {
      title: `${ICONS.book} Vocabulary Chapters`,
      description:
        "Pick any vocabulary chapter from the list to start matching cards.",
      side: "bottom",
    },
  },
  {
    element: "#b1-first-chapter",
    isTapStep: true,
    popover: {
      title: `${ICONS.tap} Start First Chapter`,
      description:
        "Tap the first chapter to enter the card-flipping workspace.",
      side: "bottom",
      showButtons: [],
    },
  },
];

export const getB1FlashcardPracticeSteps = () => [
  {
    element: "#flashcard-container",
    isTapStep: true,
    popover: {
      title: `${ICONS.tap} Flip to Learn`,
      description:
        "Tap the card to reveal the translation, pronunciation details, and example usage.",
      popoverClass: "practice-card-popover",
      side: "top",
      showButtons: ["close"],
    },
  },
];

export const getB1DescribeSpeakSelectSteps = () => [
  {
    element: "#b1-describe-speak-chapter-list",
    popover: {
      title: `${ICONS.mic} Describe & Speak Topics`,
      description: "Choose a topic to describe.",
      side: "bottom",
    },
  },
  {
    element: "#b1-describe-speak-first-chapter",
    isTapStep: true,
    popover: {
      title: `${ICONS.tap} Select Topic`,
      description: "Tap this topic card to open the speaking workspace.",
      side: "bottom",
      showButtons: [],
    },
  },
];

export const getB1DescribeSpeakWorkspaceSteps = () => [
  {
    element: "#b1-describe-speak-image-prompt",
    popover: {
      title: `${ICONS.book} Image Prompt`,
      description:
        "Examine the prompt image and think about your response structure in German.",
      side: "bottom",
    },
  },
  {
    element: "#b1-describe-speak-upload-writing-btn",
    popover: {
      title: `${ICONS.tap} Upload Writing Image`,
      description:
        "Upload a photo of handwritten German writing and the app will extract the text for review.",
      side: "top",
      align: "center",
    },
  },
  {
    element: "#b1-describe-speak-submit-writing-btn",
    popover: {
      title: `${ICONS.check} Submit Writing`,
      description:
        "Submit your German writing first. After feedback, you can continue into the speaking practice.",
      side: "top",
      showButtons: ["next"],
      nextBtnText: "Got it",
    },
  },
];

export const getB1MayaLobbySteps = () => [
  {
    element: "#b1-maya-call-btn",
    isTapStep: true,
    popover: {
      title: `${ICONS.sparkles} Call Maya`,
      description:
        "Tap here to start a live German conversation with Maya.",
      side: "top",
      align: "center",
      showButtons: [],
    },
  },
];

export const getB1ReadListenSelectSteps = () => [
  {
    element: "#b1-read-listen-news",
    popover: {
      title: `${ICONS.headphones} B1 News Articles`,
      description:
        "Read fresh headlines and toggle between German & English translations.",
      side: "bottom",
    },
  },
  {
    element: "#b1-read-listen-articles",
    popover: {
      title: `${ICONS.book} Curated Reading`,
      description:
        "Deepen comprehension with articles styled for the B1 vocabulary range.",
      side: "bottom",
    },
  },
  {
    element: "#b1-read-listen-video",
    popover: {
      title: `${ICONS.headphones} Video Lessons`,
      description:
        "Watch native German video streams and answer interactive checkpoints.",
      side: "top",
      showButtons: ["next"],
      nextBtnText: "Got it",
    },
  },
];

export const getB1ExamsSelectSteps = () => [
  {
    element: "#b1-exams-list-container",
    popover: {
      title: `${ICONS.fileText} Practice Exam Papers`,
      description: "Choose a practice exam type to begin mock papers.",
      side: "bottom",
    },
  },
  {
    element: "#b1-exam-first-item",
    popover: {
      title: `${ICONS.tap} Choose Certification`,
      description:
        "Select Goethe or TELC to view their corresponding exam sheets.",
      side: "bottom",
      showButtons: ["next"],
      nextBtnText: "Got it",
    },
  },
];
