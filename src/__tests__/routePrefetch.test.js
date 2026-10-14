import { describe, expect, it, vi } from "vitest";
import { likelyNextRoutes, prefetchPath, setPrefetchRoutes } from "../router/prefetch";

const page = () => vi.fn(() => Promise.resolve({ Component: () => null }));
const routes = [
  { path: "/", element: null },
  { path: "/a1/flashcard", lazy: page() },
  { path: "/a1/flashcard/:chapterId", lazy: page() },
  { path: "/a1/grammar", lazy: page() },
  { path: "/a2/flashcard", lazy: page() },
  { path: "/video-courses", lazy: page() },
  { path: "/video-courses/:courseId", lazy: page() },
  { path: "/video-course/:videoId", lazy: page() },
];
setPrefetchRoutes(routes);
const paths = (list) => list.map((r) => r.path);

describe("route prefetch", () => {
  it("warms the level's practice screens from home", () => {
    expect(paths(likelyNextRoutes("/", "A1"))).toEqual(["/a1/flashcard", "/a1/grammar"]);
    expect(paths(likelyNextRoutes("/", "a2"))).toEqual(["/a2/flashcard"]);
  });

  it("warms the detail screen one level down", () => {
    expect(paths(likelyNextRoutes("/a1/flashcard", "A1"))).toEqual(["/a1/flashcard/:chapterId"]);
    expect(paths(likelyNextRoutes("/video-courses", "A1"))).toEqual(["/video-courses/:courseId"]);
    expect(paths(likelyNextRoutes("/video-courses/3", "A1"))).toEqual(["/video-course/:videoId"]);
  });

  it("loads a tapped link's chunk once", () => {
    prefetchPath("/video-courses/7");
    prefetchPath("/video-courses/8");
    expect(routes[6].lazy).toHaveBeenCalledTimes(1);
    expect(routes[5].lazy).not.toHaveBeenCalled();
  });
});
