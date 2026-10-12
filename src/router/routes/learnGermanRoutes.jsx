import { lazyPage } from "../lazyPage";

const lesson = { pullToRefresh: false };

export const learnGermanRoutes = [
  // The gate picks v1 or Guided German v2 by the user's stored variant + the
  // learn_german_v2 flag.
  { path: "/learn-german", lazy: lazyPage(() => import("../../pages/learnGerman/LearnGermanGate")) },
  {
    path: "/learn-german/lesson/:chapterId",
    lazy: lazyPage(() => import("../../pages/learnGerman/lesson/NewLessonFlow")),
    handle: lesson,
  },
  { path: "/learn-german/recap", lazy: lazyPage(() => import("../../pages/learnGerman/RecapScreen")) },
  { path: "/learn-german/recap/:chapterId", lazy: lazyPage(() => import("../../pages/learnGerman/RecapScreen")) },
  // Guided German v2 — the backend 403s these when the flag is off and the
  // pages bounce back to /learn-german.
  {
    path: "/learn-german/v2/lesson/:topicId/:subKey",
    lazy: lazyPage(() => import("../../pages/learnGermanV2/Lg2LessonPage")),
    handle: lesson,
  },
  { path: "/learn-german/v2/recap/:topicId", lazy: lazyPage(() => import("../../pages/learnGermanV2/Lg2Recap")) },
  { path: "/learn-german/v2/passport", lazy: lazyPage(() => import("../../pages/learnGermanV2/Lg2Passport")) },
];
