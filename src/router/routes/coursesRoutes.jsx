import { gatedPage } from "../FeatureFlagGated";

// Video courses & study notes, all behind the german_classes flag.
const course = (path, importer, handle) => ({
  path,
  lazy: gatedPage("german_classes", importer),
  handle,
});

const b1Roams = { funnels: { jobs: "b1" } };

export const coursesRoutes = [
  course("/video-courses", () => import("../../pages/videoCourses/CourseSelectPage"), b1Roams),
  course("/video-courses/:courseId", () => import("../../pages/videoCourses/VideoListPage"), {
    ...b1Roams,
    pullToRefresh: false,
  }),
  course("/video-course/:videoId", () => import("../../pages/videoCourses/VideoPlayerPage"), {
    ...b1Roams,
    pullToRefresh: false,
    footer: true,
  }),
  course("/notes", () => import("../../pages/notes/NotesListPage"), { footer: true }),
  course("/notes/:noteId", () => import("../../pages/notes/NotePreviewPage"), { footer: true }),
];
