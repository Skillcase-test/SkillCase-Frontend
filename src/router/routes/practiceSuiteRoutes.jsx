import { lazyPage } from "../lazyPage";

// B1/B2 practice suite. B1/B2 users own the Exam & Practice / Jobs switcher,
// so they may roam here even while their saved mode is job_screening.
const suiteHandle = { funnels: { jobs: "b1" } };

const suite = (path, importer) => ({ path, lazy: lazyPage(importer), handle: suiteHandle });

// One Maya page for every level
export const mayaPage = (level) => async () => {
  const { default: MayaPage } = await import("../../pages/maya/MayaPage");
  return { default: () => <MayaPage level={level} /> };
};

export const practiceSuiteRoutes = [
  suite("/b1", () => import("../../pages/b1/read-listen/ReadListenSelect")),
  suite("/b1/read-listen", () => import("../../pages/b1/read-listen/ReadListenSelect")),
  suite("/b1/read-listen/list/:module", () => import("../../pages/b1/read-listen/ReadListenTopicSelect")),
  suite("/b1/read-listen/list/:module/:chapterId", () => import("../../pages/b1/read-listen/ReadListenTopicSelect")),
  suite("/b1/read-listen/content/:contentId", () => import("../../pages/b1/read-listen/NewsArticleReader")),
  suite("/b1/read-listen/success", () => import("../../pages/b1/read-listen/NewsArticleSuccess")),
  suite("/b1/read-listen/video/:videoId", () => import("../../pages/b1/read-listen/VideoReader")),
  suite("/b1/read-listen/video-success", () => import("../../pages/b1/read-listen/VideoSuccess")),
  suite("/b1/describe-speak", () => import("../../pages/b1/describe-speak/DescribeSpeakSelect")),
  suite("/b1/describe-speak/workspace/:topicId", () => import("../../pages/b1/describe-speak/DescribeSpeakWorkspace")),
  suite("/b1/describe-speak/success", () => import("../../pages/b1/describe-speak/DescribeSpeakSuccess")),
  // B1 exams (Goethe & TELC)
  suite("/b1/exams", () => import("../../pages/b1/exams/ExamSelect")),
  suite("/b1/exams/:examType/papers", () => import("../../pages/b1/exams/PaperSelect")),
  suite("/b1/exams/papers/:paperId/dashboard", () => import("../../pages/b1/exams/ExamBlockSelector")),
  suite("/b1/exams/papers/:paperId/reading", () => import("../../pages/b1/exams/ExamReadingWorkspace")),
  suite("/b1/exams/papers/:paperId/reading/results", () => import("../../pages/b1/exams/ExamReadingResults")),
  suite("/b1/exams/papers/:paperId/writing", () => import("../../pages/b1/exams/ExamWritingWorkspace")),
  suite("/b1/exams/papers/:paperId/writing/results", () => import("../../pages/b1/exams/ExamWritingResults")),
  suite("/b1/exams/papers/:paperId/listening", () => import("../../pages/b1/exams/ExamListeningWorkspace")),
  suite("/b1/exams/papers/:paperId/listening/results", () => import("../../pages/b1/exams/ExamListeningResults")),
  suite("/b1/exams/papers/:paperId/speaking", () => import("../../pages/b1/exams/ExamSpeakingWorkspace")),
  suite("/b1/exams/papers/:paperId/speaking/results", () => import("../../pages/b1/exams/ExamSpeakingResults")),
  suite("/b1/exams/papers/:paperId/congratulations", () => import("../../pages/b1/exams/ExamCongratulations")),
  suite("/b1/flashcard", () => import("../../pages/b1/flashcard/B1FlashcardSelect")),
  suite("/b1/flashcard/:chapterId", () => import("../../pages/b1/flashcard/B1Flashcard")),
  suite("/b1/maya", mayaPage("B1")),
  suite("/b1admin", () => import("../../pages/b1/B1AdminPage")),

  // B2 — no /b2 route: "/" is the single B2 home and its feature cards route
  // straight to each module. Static paths outrank /b2/:module.
  suite("/b2/test", () => import("../../pages/b2/test/B2TestScreen")),
  suite("/b2/test/ready", () => import("../../pages/b2/exams/ExamGetReady")),
  suite("/b2/exams", () => import("../../pages/b2/exams/PaperSelect")),
  suite("/b2/exams/papers/:paperId/dashboard", () => import("../../pages/b2/exams/ExamSectionRedirect")),
  suite("/b2/exams/papers/:paperId/reading", () => import("../../pages/b2/exams/ExamReadingWorkspace")),
  suite("/b2/exams/papers/:paperId/reading/results", () => import("../../pages/b2/exams/ExamReadingResults")),
  suite("/b2/exams/papers/:paperId/writing", () => import("../../pages/b2/exams/ExamWritingWorkspace")),
  suite("/b2/exams/papers/:paperId/writing/results", () => import("../../pages/b2/exams/ExamWritingResults")),
  suite("/b2/exams/papers/:paperId/listening", () => import("../../pages/b2/exams/ExamListeningWorkspace")),
  suite("/b2/exams/papers/:paperId/listening/results", () => import("../../pages/b2/exams/ExamListeningResults")),
  suite("/b2/exams/papers/:paperId/speaking", () => import("../../pages/b2/exams/ExamSpeakingWorkspace")),
  suite("/b2/exams/papers/:paperId/speaking/results", () => import("../../pages/b2/exams/ExamSpeakingResults")),
  suite("/b2/exams/papers/:paperId/congratulations", () => import("../../pages/b2/exams/B2Result")),
  suite("/b2/maya", mayaPage("B2")),
  suite("/b2/:module", () => import("../../pages/b2/modules/ExerciseSelect")),
  suite("/b2/reading/:exerciseId", () => import("../../pages/b2/modules/ReadingWorkspace")),
  suite("/b2/reading/:exerciseId/results", () => import("../../pages/b2/modules/ReadingResults")),
  suite("/b2/listening/:exerciseId", () => import("../../pages/b2/modules/ListeningWorkspace")),
  suite("/b2/listening/:exerciseId/results", () => import("../../pages/b2/modules/ListeningResults")),
  suite("/b2/writing/:exerciseId", () => import("../../pages/b2/modules/WritingWorkspace")),
  suite("/b2/writing/:exerciseId/results", () => import("../../pages/b2/modules/WritingResults")),
  suite("/b2/speaking/:exerciseId", () => import("../../pages/b2/modules/SpeakingWorkspace")),
  suite("/b2/speaking/:exerciseId/results", () => import("../../pages/b2/modules/SpeakingResults")),
  suite("/b2admin", () => import("../../pages/b2/B2AdminPage")),
];
