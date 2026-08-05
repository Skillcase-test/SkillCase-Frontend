import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Loader2, PlayCircle } from "lucide-react";
import { getVideoCourses } from "../../api/videoCourseApi";
import { trackFeatureEvent } from "../../telemetry/events";
import { useUsageLimitGate } from "../../hooks/useUsageLimits";

export default function CourseSelectPage() {
  const navigate = useNavigate();
  useUsageLimitGate("ALL", "video_courses");

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVideoCourses()
      .then((res) => {
        const nextCourses = res.data?.data || [];
        setCourses(nextCourses);
        trackFeatureEvent("video_courses", "course_list_viewed", {
          entityType: "course_catalog",
          total: nextCourses.length,
        });
      })
      .catch((err) => console.error("Error fetching video courses:", err))
      .finally(() => setLoading(false));
  }, []);

  const openCourse = (course) => {
    trackFeatureEvent("video_courses", "course_opened", {
      entityType: "course",
      entityId: course.course_id,
      attributes: {
        level: course.proficiency_level,
        video_count: course.video_count,
      },
    });
    navigate(`/video-courses/${course.course_id}`);
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col shadow-sm">
      <div className="self-stretch px-4 py-2.5 flex justify-between items-center bg-white">
        <button
          onClick={() => navigate("/")}
          className="px-0.5 flex items-center gap-2 cursor-pointer bg-transparent border-0 outline-none"
        >
          <ChevronLeft className="w-4 h-4 text-slate-900" />
          <span className="text-slate-900 text-sm font-semibold leading-6">Back</span>
        </button>
        <span className="text-neutral-500 text-sm font-semibold leading-6">
          Video Courses
        </span>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
        </div>
      ) : courses.length === 0 ? (
        <p className="text-center text-slate-400 py-12 text-sm">
          No courses available yet.
        </p>
      ) : (
        <div className="px-4 py-4 flex flex-col gap-3">
          {courses.map((course) => {
            const total = Number(course.video_count) || 0;
            const done = Number(course.completed_count) || 0;
            const percent = total ? Math.round((done / total) * 100) : 0;

            return (
              <button
                key={course.course_id}
                onClick={() => openCourse(course)}
                className="w-full p-3 bg-white rounded-xl border border-zinc-200 flex gap-3 items-center text-left cursor-pointer hover:border-[#002856] transition-all"
              >
                <div className="w-24 h-16 shrink-0 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center">
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <PlayCircle className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <span className="text-sky-950 text-sm font-semibold leading-5 truncate">
                    {course.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 bg-black/5 rounded-[40px] text-neutral-500 text-[10px] font-medium">
                      {course.proficiency_level}
                    </span>
                    <span className="px-2 py-0.5 bg-black/5 rounded-[40px] text-neutral-500 text-[10px] font-medium capitalize">
                      {course.difficulty}
                    </span>
                    {course.total_hours ? (
                      <span className="text-neutral-400 text-[10px] font-medium">
                        {course.total_hours}h
                      </span>
                    ) : null}
                  </div>
                  <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#019035] rounded-full"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="text-neutral-500 text-[10px] font-medium">
                    {done}/{total} videos completed
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
