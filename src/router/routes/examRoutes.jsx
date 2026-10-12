import { lazyPage } from "../lazyPage";

// Hard-core tests + the standalone scholarship funnel. Screening candidates
// take these too. A pull-to-refresh mid-attempt restarts the exam and drops
// answers still waiting on their debounce, so it's off on the take screens.
const exam = { funnels: { jobs: true } };
const attempt = { ...exam, pullToRefresh: false };

export const examRoutes = [
  { path: "/exam/:testId", lazy: lazyPage(() => import("../../pages/exam/ExamLobby")), handle: exam },
  { path: "/exam/:testId/take", lazy: lazyPage(() => import("../../pages/exam/ExamPage")), handle: attempt },
  { path: "/exam/:testId/result", lazy: lazyPage(() => import("../../pages/exam/ExamResult")), handle: exam },

  { path: "/scholarship", lazy: lazyPage(() => import("../../pages/scholarship/ScholarshipHome")), handle: exam },
  {
    path: "/scholarship/:testId/take",
    lazy: lazyPage(() => import("../../pages/scholarship/ScholarshipExamPage")),
    handle: attempt,
  },
  {
    path: "/scholarship/:testId/result",
    lazy: lazyPage(() => import("../../pages/scholarship/ScholarshipResult")),
    handle: exam,
  },
];
