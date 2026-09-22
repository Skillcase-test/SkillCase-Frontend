const ICONS = {
  book: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#002856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>`,
  headphones: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#002856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></svg>`,
  mic: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#002856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>`,
  fileText: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#002856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/></svg>`,
  penLine: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#002856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
  flame: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
  tap: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#002856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>`,
  filter: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#002856" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`,
};

const MODULE_TOUR_COPY = {
  reading: {
    title: "Reading",
    tagline: "Real exam passages with questions to build comprehension.",
  },
  listening: {
    title: "Listening",
    tagline: "Real audio tracks with questions to train your ear.",
  },
  speaking: {
    title: "Speaking",
    tagline: "Speak your answers. AI scores pronunciation and content.",
  },
  writing: {
    title: "Writing",
    tagline: "Write on real prompts. AI checks grammar and structure.",
  },
};

export const getB2LandingSteps = (onSkip) => [
  {
    popover: {
      title: "Welcome!",
      description: "Let's quickly show you everything you can practice here.",
      showButtons: ["next", "close"],
      nextBtnText: "Start Tour",
      onCloseClick: onSkip,
    },
  },
  {
    element: "#b2-feature-cards-grid",
    popover: {
      title: "Your Practice Hub",
      description: "All your modules live here. Let's go through them.",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: "#b2-reading-card",
    popover: {
      title: `${ICONS.book} Reading`,
      description: "Solve real exam texts and questions.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#b2-listening-card",
    popover: {
      title: `${ICONS.headphones} Listening`,
      description: "Play exam audio and test your understanding.",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: "#b2-writing-card",
    popover: {
      title: `${ICONS.penLine} Writing`,
      description: "Write emails and essays. AI gives detailed feedback.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: "#b2-speaking-card",
    popover: {
      title: `${ICONS.mic} Speaking`,
      description: "Record answers, get instant pronunciation feedback.",
      side: "top",
      align: "start",
    },
  },
  {
    element: "#b2-exams-card",
    popover: {
      title: `${ICONS.fileText} Exam Papers`,
      description: "Take full timed TELC and Goethe mock exams.",
      side: "top",
      align: "center",
    },
  },
  {
    element: "#streak-widget",
    popover: {
      title: `${ICONS.flame} Daily Streak`,
      description: "Practice a little every day to keep it alive.",
      side: "top",
    },
  },
  {
    popover: {
      title: `${ICONS.tap} You're All Set`,
      description: "Tap any module to start. We'll show you around inside.",
      showButtons: ["next"],
      nextBtnText: "Got it",
      popoverClass: "completion-popover",
    },
  },
];

export const getB2ModuleSelectSteps = (module) => {
  const copy = MODULE_TOUR_COPY[module] || MODULE_TOUR_COPY.reading;
  return [
    {
      element: `#b2-${module}-tag-pills`,
      popover: {
        title: `${ICONS.filter} ${copy.title}`,
        description: `${copy.tagline} Filter by All, TELC or Goethe. Numbers show what's inside.`,
        side: "bottom",
        align: "center",
      },
    },
    {
      element: `#b2-${module}-first-exercise`,
      isTapStep: true,
      popover: {
        title: `${ICONS.tap} Pick an Exercise`,
        description: "Tap a card to open it and start practicing.",
        side: "bottom",
        showButtons: [],
      },
    },
  ];
};

export const getB2ExamsSelectSteps = () => [
  {
    element: "#b2-exam-type-pills",
    popover: {
      title: `${ICONS.filter} Exam Papers`,
      description: "Pick TELC or Goethe. Numbers show how many papers each has.",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: "#b2-exam-first-paper",
    popover: {
      title: `${ICONS.tap} Start a Paper`,
      description: "Tap a paper to begin. It covers all four timed sections.",
      side: "bottom",
      showButtons: ["next"],
      nextBtnText: "Got it",
    },
  },
];
