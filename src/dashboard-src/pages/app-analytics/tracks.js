// Learner tracks the admin can move someone between. `payload` is exactly what
// PATCH /admin/users/:id receives.
const practice = (level) => ({
  current_profeciency_level: level,
  language_level: level,
  lg_preferred_mode: "practice",
  german_preference: "2",
});

const PRACTICE_STYLE = { dot: "bg-indigo-500", trigger: "border-indigo-200 bg-indigo-50 text-indigo-700" };
const SCREENING_STYLE = { dot: "bg-orange-500", trigger: "border-orange-200 bg-orange-50 text-orange-700" };

export const USER_TRACK_OPTIONS = [
  { value: "A1", label: "A1", name: "A1", desc: "Beginner · practice", dot: "bg-sky-500", trigger: "border-sky-200 bg-sky-50 text-sky-700", payload: practice("A1") },
  { value: "A2", label: "A2", name: "A2", desc: "Elementary · practice", dot: "bg-teal-500", trigger: "border-teal-200 bg-teal-50 text-teal-700", payload: practice("A2") },
  { value: "B1_PRACTICE", label: "B1 Practice", name: "B1 Practice", desc: "Intermediate · practice", ...PRACTICE_STYLE, payload: practice("B1") },
  { value: "B2_PRACTICE", label: "B2 Practice", name: "B2 Practice", desc: "Upper intermediate · practice", ...PRACTICE_STYLE, payload: practice("B2") },
  {
    value: "B1_JOB_SCREENING",
    label: "B1 Screening",
    name: "B1 Job Screening",
    desc: "B1 German · job screening",
    ...SCREENING_STYLE,
    payload: { current_profeciency_level: "B1", language_level: "B1", lg_preferred_mode: "job_screening", german_preference: "3" },
  },
  {
    value: "B2_JOB_SCREENING",
    label: "B2 Screening",
    name: "B2 Job Screening",
    desc: "B2 German · job screening",
    ...SCREENING_STYLE,
    payload: { current_profeciency_level: "B1", language_level: "B2", lg_preferred_mode: "job_screening", german_preference: "3" },
  },
];

export function getUserTrackValue(user = {}) {
  const mode = String(user.lg_preferred_mode || "").toLowerCase();
  const preference = String(user.german_preference || "");
  const languageLevel = String(user.language_level || user.current_profeciency_level || "A1").toUpperCase();
  const learningLevel = String(user.current_profeciency_level || "A1").toUpperCase();
  const isJobScreening = mode === "job_screening" || preference === "3";

  if (isJobScreening) {
    return languageLevel === "B2" ? "B2_JOB_SCREENING" : "B1_JOB_SCREENING";
  }
  if (languageLevel === "B2" || learningLevel === "B2") return "B2_PRACTICE";
  if (languageLevel === "B1" || learningLevel === "B1") return "B1_PRACTICE";
  if (learningLevel === "A2") return "A2";
  return "A1";
}
