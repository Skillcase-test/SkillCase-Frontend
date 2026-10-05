// Shared promo-ad vocab — admin editor and in-app host stay in sync.

export const SURFACE_BY_PATH = {
  "/": "home",
  "/learn-german": "learn_german",
  "/video-courses": "video_courses",
  "/job-screening": "job_screening",
  "/scholarship": "scholarship",
};

export const AD_SURFACES = [
  { key: "home", label: "Home (feature cards)" },
  { key: "learn_german", label: "Learn German home" },
  { key: "video_courses", label: "German Classes" },
  { key: "job_screening", label: "Job Screening lobby" },
  { key: "scholarship", label: "Scholarship hub" },
];

export const AD_TEMPLATES = [
  { key: "card", label: "Card" },
  { key: "banner", label: "Banner" },
  { key: "chip", label: "Chip" },
];

// Image frame shape for the card template; banner/chip keep fixed thumbs.
export const AD_IMAGE_RATIOS = [
  { key: "16:9", label: "16:9" },
  { key: "1:1", label: "1:1" },
  { key: "9:16", label: "9:16" },
];

export const AD_POSITIONS = [
  { key: "top_left", label: "Top left" },
  { key: "top_center", label: "Top center" },
  { key: "top_right", label: "Top right" },
  { key: "bottom_left", label: "Bottom left" },
  { key: "bottom_center", label: "Bottom center" },
  { key: "bottom_right", label: "Bottom right" },
];

export const AD_FREQUENCIES = [
  { key: "every_visit", label: "Every visit" },
  { key: "daily", label: "Once a day" },
  { key: "once", label: "Once ever" },
];

export const AD_CTA_TYPES = [
  { key: "none", label: "No button" },
  { key: "route", label: "Open app screen" },
  { key: "url", label: "Open external link" },
  { key: "call", label: "Phone call" },
];

// Screens an ad CTA can route to — only param-free, user-facing destinations.
export const APP_SCREENS = [
  { group: "Home & hubs", path: "/", label: "Home (feature cards)" },
  { group: "Home & hubs", path: "/learn-german", label: "Learn German home" },
  { group: "Home & hubs", path: "/video-courses", label: "German Classes" },
  { group: "Home & hubs", path: "/job-screening", label: "Job Screening lobby" },
  { group: "Home & hubs", path: "/scholarship", label: "Scholarship hub" },
  { group: "Home & hubs", path: "/events", label: "Events" },
  { group: "Home & hubs", path: "/news", label: "News" },
  { group: "Home & hubs", path: "/notes", label: "Notes" },
  { group: "Home & hubs", path: "/stories", label: "Stories" },
  { group: "Learn German", path: "/learn-german/v2/passport", label: "Learning passport" },
  { group: "Learn German", path: "/learn-german/recap", label: "Recap" },
  { group: "A1", path: "/a1", label: "A1 home" },
  { group: "A1", path: "/a1/test", label: "A1 tests" },
  { group: "A1", path: "/a1/flashcard", label: "A1 flashcards" },
  { group: "A1", path: "/a1/grammar", label: "A1 grammar" },
  { group: "A1", path: "/a1/listening", label: "A1 listening" },
  { group: "A1", path: "/a1/speaking", label: "A1 speaking" },
  { group: "A1", path: "/a1/reading", label: "A1 reading" },
  { group: "A1", path: "/a1/nursing", label: "A1 nursing" },
  { group: "A2", path: "/a2", label: "A2 home" },
  { group: "A2", path: "/a2/test", label: "A2 tests" },
  { group: "A2", path: "/a2/flashcard", label: "A2 flashcards" },
  { group: "A2", path: "/a2/grammar", label: "A2 grammar" },
  { group: "A2", path: "/a2/listening", label: "A2 listening" },
  { group: "A2", path: "/a2/speaking", label: "A2 speaking" },
  { group: "A2", path: "/a2/reading", label: "A2 reading" },
  { group: "B1", path: "/b1", label: "B1 home" },
  { group: "B1", path: "/b1/exams", label: "B1 exams" },
  { group: "B1", path: "/b1/flashcard", label: "B1 flashcards" },
  { group: "B1", path: "/b1/describe-speak", label: "B1 describe & speak" },
  { group: "B1", path: "/b1/read-listen", label: "B1 read & listen" },
  { group: "B1", path: "/b1/maya", label: "B1 Maya" },
  { group: "B2", path: "/b2/exams", label: "B2 exams" },
  { group: "B2", path: "/b2/test", label: "B2 tests" },
  { group: "B2", path: "/b2/maya", label: "B2 Maya" },
  { group: "Jobs", path: "/jobs", label: "Jobs" },
  { group: "Jobs", path: "/job-screening/course", label: "Screening course" },
  { group: "Jobs", path: "/job-screening/refer", label: "Refer a friend" },
  { group: "Profile & plans", path: "/profile", label: "Profile" },
  { group: "Profile & plans", path: "/profile/upgrade", label: "Upgrade plan" },
  { group: "Profile & plans", path: "/profile/manage-plan", label: "Manage plan" },
  { group: "Profile & plans", path: "/profile/transactions", label: "Transactions" },
  { group: "Profile & plans", path: "/trial-offer", label: "Trial offer" },
];

export const AD_LEVELS = ["a1", "a2", "b1", "b2"];

// Column-flex alignment for the overlay's slide wrapper (justify =
// vertical in column direction, items = horizontal).
export const POSITION_INNER = {
  top_left: "justify-start items-start",
  top_center: "justify-start items-center",
  top_right: "justify-start items-end",
  bottom_left: "justify-end items-start",
  bottom_center: "justify-end items-center",
  bottom_right: "justify-end items-end",
};

// Entrance offset — the card slides in from its own side of the screen.
export const POSITION_MOTION = {
  top_left: { x: -24, y: -12 },
  top_center: { x: 0, y: -24 },
  top_right: { x: 24, y: -12 },
  bottom_left: { x: -24, y: 12 },
  bottom_center: { x: 0, y: 24 },
  bottom_right: { x: 24, y: 12 },
};
