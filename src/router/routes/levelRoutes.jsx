import { Navigate } from "react-router-dom";
import A1EntryResolver from "../../components/a1/A1EntryResolver";
import { lazyPage } from "../lazyPage";
import { mayaPage } from "./practiceSuiteRoutes";

// A1/A2 practice modules + Medical German (shared across levels).
export const levelRoutes = [
  { path: "/a1", element: <A1EntryResolver /> },
  { path: "/a1/flashcard", lazy: lazyPage(() => import("../../pages/a1/flashcard/A1FlashcardSelect")) },
  { path: "/a1/flashcard/:chapterId", lazy: lazyPage(() => import("../../pages/a1/flashcard/A1Flashcard")) },
  { path: "/a1/grammar", lazy: lazyPage(() => import("../../pages/a1/grammar/A1GrammarSelect")) },
  { path: "/a1/grammar/:topicId", lazy: lazyPage(() => import("../../pages/a1/grammar/A1GrammarPractice")) },
  { path: "/a1/listening", lazy: lazyPage(() => import("../../pages/a1/listening/A1ListeningSelect")) },
  { path: "/a1/listening/:chapterId", lazy: lazyPage(() => import("../../pages/a1/listening/A1ListeningContent")) },
  { path: "/a1/speaking", lazy: lazyPage(() => import("../../pages/a1/speaking/A1SpeakingSelect")) },
  { path: "/a1/speaking/:chapterId", lazy: lazyPage(() => import("../../pages/a1/speaking/A1Speaking")) },
  { path: "/a1/reading", lazy: lazyPage(() => import("../../pages/a1/reading/A1ReadingSelect")) },
  { path: "/a1/reading/:chapterId", lazy: lazyPage(() => import("../../pages/a1/reading/A1Reading")) },
  { path: "/a1/test", lazy: lazyPage(() => import("../../pages/a1/test/A1TestSelect")) },
  { path: "/a1/test/:topicId", lazy: lazyPage(() => import("../../pages/a1/test/A1TestLevel")) },
  { path: "/a1/test/:topicId/:level", lazy: lazyPage(() => import("../../pages/a1/test/A1TestQuestions")) },
  { path: "/a1/nursing", lazy: lazyPage(() => import("../../pages/a1/nursing/A1NursingSelect")) },
  { path: "/a1/nursing/:chapterId", lazy: lazyPage(() => import("../../pages/a1/nursing/A1NursingChapter")) },

  { path: "/a2", element: <Navigate to="/a2/flashcard" replace /> },
  { path: "/a2/flashcard", lazy: lazyPage(() => import("../../pages/a2/flashcard/A2FlashcardSelect")) },
  { path: "/a2/flashcard/:chapterId", lazy: lazyPage(() => import("../../pages/a2/flashcard/A2Flashcard")) },
  { path: "/a2/grammar", lazy: lazyPage(() => import("../../pages/a2/grammar/A2GrammarSelect")) },
  { path: "/a2/grammar/:topicId", lazy: lazyPage(() => import("../../pages/a2/grammar/A2GrammarPractice")) },
  { path: "/a2/listening", lazy: lazyPage(() => import("../../pages/a2/listening/A2ListeningSelect")) },
  { path: "/a2/listening/:chapterId", lazy: lazyPage(() => import("../../pages/a2/listening/A2ListeningContent")) },
  { path: "/a2/speaking", lazy: lazyPage(() => import("../../pages/a2/speaking/A2SpeakingSelect")) },
  { path: "/a2/speaking/:chapterId", lazy: lazyPage(() => import("../../pages/a2/speaking/A2Speaking")) },
  { path: "/a2/reading", lazy: lazyPage(() => import("../../pages/a2/reading/A2ReadingSelect")) },
  { path: "/a2/reading/:chapterId", lazy: lazyPage(() => import("../../pages/a2/reading/A2Reading")) },
  { path: "/a2/test", lazy: lazyPage(() => import("../../pages/a2/test/A2TestSelect")) },
  { path: "/a2/test/:topicId", lazy: lazyPage(() => import("../../pages/a2/test/A2TestLevel")) },
  { path: "/a2/test/:topicId/:level", lazy: lazyPage(() => import("../../pages/a2/test/A2TestQuestions")) },
  { path: "/a2/maya", lazy: lazyPage(mayaPage("A2")) },
];
