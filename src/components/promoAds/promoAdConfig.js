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
  { key: "url", label: "Open link" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "call", label: "Phone call" },
];

export const AD_LEVELS = ["a1", "a2", "b1", "b2"];

// Flexbox alignment inside a full-screen (or preview) overlay container.
export const POSITION_ALIGN = {
  top_left: "items-start justify-start",
  top_center: "items-start justify-center",
  top_right: "items-start justify-end",
  bottom_left: "items-end justify-start",
  bottom_center: "items-end justify-center",
  bottom_right: "items-end justify-end",
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
