import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Check,
  ChevronLeft,
  Loader2,
  PlayCircle,
  Search,
  X,
} from "lucide-react";
import {
  getVideoCourse,
  searchVideoCourseVideos,
} from "../../api/videoCourseApi";
import { trackFeatureEvent } from "../../telemetry/events";
import { useUsageLimitGate } from "../../hooks/useUsageLimits";

const formatTime = (secs) => {
  const s = Math.floor(Number(secs) || 0);
  const m = Math.floor(s / 60);
  const remSecs = s % 60;
  return `${m}:${String(remSecs).padStart(2, "0")}`;
};

export default function VideoListPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  useUsageLimitGate("ALL", "video_courses");

  const [course, setCourse] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    setLoading(true);
    getVideoCourse(courseId)
      .then((res) => {
        const nextCourse = res.data?.data?.course || null;
        const nextVideos = res.data?.data?.videos || [];
        setCourse(nextCourse);
        setVideos(nextVideos);
        trackFeatureEvent("video_courses", "video_list_viewed", {
          entityType: "course",
          entityId: courseId,
          total: nextVideos.length,
          attributes: { level: nextCourse?.proficiency_level },
        });
      })
      .catch((err) => console.error("Error fetching course videos:", err))
      .finally(() => setLoading(false));
  }, [courseId]);

  // Debounced deep search across transcripts & chapter labels via backend
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      setSearching(false);
      return undefined;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      searchVideoCourseVideos(q, courseId)
        .then((res) => {
          const found = res.data?.data || [];
          setResults(
            found.filter((v) => String(v.course_id) === String(courseId)),
          );
          trackFeatureEvent("video_courses", "search_performed", {
            entityType: "course",
            entityId: courseId,
            total: found.length,
            attributes: { query_length: q.length },
          });
        })
        .catch((err) => console.error("Video search failed:", err))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, courseId]);

  // Instant local match on title/description merged with server deep search hits
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return videos;

    const localMatches = videos.filter(
      (v) =>
        v.title?.toLowerCase().includes(q) ||
        v.description?.toLowerCase().includes(q),
    );

    if (results && results.length > 0) {
      const mergedMap = new Map();
      localMatches.forEach((v) => mergedMap.set(v.video_id, v));
      results.forEach((v) => mergedMap.set(v.video_id, v));
      return Array.from(mergedMap.values());
    }

    return localMatches;
  }, [query, videos, results]);

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-[#FDFDFD] flex flex-col shadow-sm relative">
      {/* Header Bar */}
      <div
        className="self-stretch px-4 pb-2.5 flex justify-between items-center bg-white sticky top-0 z-30 border-b border-zinc-100"
        style={{ paddingTop: "calc(0.625rem + env(safe-area-inset-top, 0px))" }}
      >
        <button
          type="button"
          onClick={() => navigate("/video-courses")}
          className="px-0.5 flex items-center gap-2 cursor-pointer bg-transparent border-0 outline-none"
        >
          <ChevronLeft className="w-4 h-4 text-slate-900" />
          <span className="text-slate-900 text-sm font-semibold leading-6">
            Back
          </span>
        </button>
        <span className="text-neutral-500 text-sm font-semibold leading-6 truncate max-w-[60%]">
          Video Classes
        </span>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full overflow-y-auto pb-32">
        {/* Course Thumbnail Hero Section */}
        {course?.thumbnail_url && (
          <div className="relative w-full aspect-[21/9] max-h-44 overflow-hidden bg-slate-100">
            <img
              src={course.thumbnail_url}
              alt=""
              className="w-full h-full object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/30 to-transparent" />
          </div>
        )}

        {/* Course Title & Description (Figma Exact) */}
        <div className="px-4 pt-3.5 pb-1 flex flex-col gap-0.5">
          <h1 className="text-slate-900 text-[17px] font-bold leading-6 tracking-tight">
            {course?.name || "German Course Level 1"}
          </h1>
          <p className="text-slate-500 text-xs font-normal leading-4">
            Watch videos and learn
          </p>
        </div>

        {/* Video Cards List (Figma Exact Direct Layout) */}
        {loading ? (
          <div className="px-4 py-3.5 flex flex-col gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="w-full flex flex-col gap-2 animate-pulse">
                <div className="w-full aspect-video rounded-lg bg-slate-200" />
                <div className="h-4.5 w-3/4 bg-slate-200 rounded" />
                <div className="h-3 w-1/3 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : shown.length === 0 ? (
          <div className="text-center text-slate-400 py-16 px-4 text-xs flex flex-col items-center gap-2">
            <Search className="w-8 h-8 text-slate-300 stroke-[1.5]" />
            <p>
              {query
                ? `No videos found matching "${query}"`
                : "No videos in this course yet."}
            </p>
          </div>
        ) : (
          <div className="px-2 py-2 flex flex-col gap-5">
            {shown.map((video) => (
              <div
                key={video.video_id}
                onClick={() => {
                  trackFeatureEvent("video_courses", "video_opened", {
                    entityType: "course_video",
                    entityId: video.video_id,
                    attributes: { course_id: courseId },
                  });
                  navigate(`/video-course/${video.video_id}`);
                }}
                className="w-full flex flex-col gap-2 cursor-pointer group  border border-slate-100 px-2 py-2 rounded-md shadow-sm"
              >
                {/* Crisp 16:9 Thumbnail Image */}
                <div className="w-full aspect-video rounded-md bg-slate-100 overflow-hidden relative flex items-center justify-center">
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-200"
                    />
                  ) : (
                    <PlayCircle className="w-10 h-10 text-slate-400" />
                  )}
                </div>

                {/* Video Info Row (Figma Exact Typography) */}
                <div className="flex flex-col gap-0.5 ml-2">
                  <h2 className="text-slate-900 text-sm font-semibold leading-snug text-left group-hover:text-[#002856] transition-colors tracking-tight">
                    {video.title}
                  </h2>

                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-slate-500 text-[10px] font-normal">
                      {formatTime(video.video_duration)}
                    </span>

                    {video.completed ? (
                      <span className="px-2 py-0.5 bg-[#E6F4EA] text-[#137333] text-[8px] font-medium rounded-full inline-flex items-center justify-center leading-none">
                        watched
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-[#FEF3C7] text-[#B45309] text-[8px] font-medium rounded-full inline-flex items-center justify-center leading-none">
                        Pending
                      </span>
                    )}
                  </div>
                </div>

                {/* Matched Timestamps if any */}
                {video.matched_timestamps?.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pt-0.5 pb-0.5">
                    {video.matched_timestamps.map((t) => (
                      <button
                        key={t.timestamp_id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(
                            `/video-course/${video.video_id}?t=${t.time_seconds}`,
                          );
                        }}
                        className="px-2.5 py-1 bg-slate-50 border border-zinc-200 hover:border-[#002856] hover:bg-sky-50 text-[#002856] text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                      >
                        {formatTime(t.time_seconds)} - {t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Bottom Live Search Bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-4 pt-8 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] bg-gradient-to-t from-black/40 via-black/15 to-transparent pointer-events-none z-40 flex justify-center">
        <div className="pointer-events-auto w-full bg-white hover:bg-slate-50 rounded-xl border border-zinc-200 shadow-xl p-2 flex items-center gap-2.5 transition-all">
          <div className="w-8 h-8 rounded-lg bg-sky-100 text-[#002856] flex items-center justify-center shrink-0 shadow-sm border border-sky-200/50">
            {searching ? (
              <Loader2 className="w-4 h-4 animate-spin text-sky-950" />
            ) : (
              <Search className="w-4 h-4 text-sky-950" />
            )}
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search videos, topics or description..."
            aria-label="Search videos"
            className="flex-1 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 outline-none border-0 focus:ring-0 focus:border-0"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="p-1 text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer outline-none"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
