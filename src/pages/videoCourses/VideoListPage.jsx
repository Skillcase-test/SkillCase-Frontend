import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Check, ChevronLeft, Loader2, PlayCircle, Search } from "lucide-react";
import {
  getVideoCourse,
  searchVideoCourseVideos,
} from "../../api/videoCourseApi";
import { trackFeatureEvent } from "../../telemetry/events";
import { useUsageLimitGate } from "../../hooks/useUsageLimits";

const formatTime = (secs) => {
  const s = Math.floor(Number(secs) || 0);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
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

  // Debounced search across all courses — the backend has no per-course
  // search endpoint, so results are filtered to this course client-side.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      return undefined;
    }
    const timer = setTimeout(() => {
      searchVideoCourseVideos(q)
        .then((res) => {
          const found = res.data?.data || [];
          setResults(found.filter((v) => String(v.course_id) === String(courseId)));
          trackFeatureEvent("video_courses", "search_performed", {
            entityType: "course",
            entityId: courseId,
            total: found.length,
            attributes: { query_length: q.length },
          });
        })
        .catch((err) => console.error("Video search failed:", err));
    }, 400);
    return () => clearTimeout(timer);
  }, [query, courseId]);

  const shown = results ?? videos;

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col shadow-sm">
      <div className="self-stretch px-4 py-2.5 flex justify-between items-center bg-white">
        <button
          onClick={() => navigate("/video-courses")}
          className="px-0.5 flex items-center gap-2 cursor-pointer bg-transparent border-0 outline-none"
        >
          <ChevronLeft className="w-4 h-4 text-slate-900" />
          <span className="text-slate-900 text-sm font-semibold leading-6">Back</span>
        </button>
        <span className="text-neutral-500 text-sm font-semibold leading-6 truncate max-w-[60%]">
          {course?.name || "Course"}
        </span>
      </div>

      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-zinc-200 rounded-lg">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search videos and transcripts..."
            aria-label="Search videos"
            className="flex-1 bg-transparent text-xs text-slate-800 outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
        </div>
      ) : shown.length === 0 ? (
        <p className="text-center text-slate-400 py-12 text-sm">
          {results ? "No matching videos." : "No videos in this course yet."}
        </p>
      ) : (
        <div className="px-4 py-2 flex flex-col gap-3">
          {shown.map((video) => (
            <div
              key={video.video_id}
              className="w-full p-3 bg-white rounded-xl border border-zinc-200 flex flex-col gap-2"
            >
              <button
                onClick={() => {
                  trackFeatureEvent("video_courses", "video_opened", {
                    entityType: "course_video",
                    entityId: video.video_id,
                    attributes: { course_id: courseId },
                  });
                  navigate(`/video-course/${video.video_id}`);
                }}
                className="flex gap-3 items-center text-left cursor-pointer bg-transparent border-0 p-0"
              >
                <div className="w-24 h-16 shrink-0 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center relative">
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <PlayCircle className="w-6 h-6 text-slate-400" />
                  )}
                  {video.completed && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-green-700 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <span className="text-sky-950 text-sm font-semibold leading-5">
                    {video.title}
                  </span>
                  <span className="text-neutral-500 text-[10px] font-medium">
                    {formatTime(video.video_duration)} · {video.proficiency_level}
                  </span>
                </div>
              </button>

              {video.matched_timestamps?.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {video.matched_timestamps.map((t) => (
                    <button
                      key={t.timestamp_id}
                      onClick={() =>
                        navigate(
                          `/video-course/${video.video_id}?t=${t.time_seconds}`,
                        )
                      }
                      className="px-2.5 py-1 bg-white border border-zinc-200 hover:border-[#002856] text-[#002856] text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
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
  );
}
