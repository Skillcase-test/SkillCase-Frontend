import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, PlayCircle } from "lucide-react";
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
    <div className="w-full max-w-md mx-auto bg-white flex flex-col min-h-screen pb-28">
      {loading ? (
        <div className="flex-1 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
        </div>
      ) : courses.length === 0 ? (
        <p className="text-center text-slate-400 py-16 text-sm">
          No courses available yet.
        </p>
      ) : (
        <div className="px-2 py-2 flex flex-col gap-5">
          {courses.map((course) => {
            const total = Number(course.video_count) || 0;
            const done = Number(course.completed_count) || 0;
            const started = Number(course.started_count) || 0;
            const isCompleted = done >= total && total > 0;
            const isInProgress = !isCompleted && (done > 0 || started > 0);

            return (
              <div
                key={course.course_id}
                onClick={() => openCourse(course)}
                className="w-full flex flex-col gap-2 cursor-pointer group border border-slate-100 px-2 py-2 rounded-md shadow-sm"
              >
                {/* Crisp 16:9 Thumbnail Image */}
                <div className="w-full aspect-video rounded-md bg-slate-100 overflow-hidden relative flex items-center justify-center">
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-200"
                    />
                  ) : (
                    <PlayCircle className="w-10 h-10 text-slate-400" />
                  )}
                </div>

                {/* Course Info Row */}
                <div className="flex flex-col gap-0.5 ml-2">
                  <h2 className="text-slate-900 text-sm font-semibold leading-snug text-left group-hover:text-[#002856] transition-colors tracking-tight">
                    {course.name}
                  </h2>

                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-slate-500 text-[10px] font-normal">
                      {total ? `${total} videos` : ""}
                      {course.total_hours ? ` | ${course.total_hours} hours` : ""}
                    </span>

                    {isCompleted ? (
                      <span className="px-2 py-0.5 bg-[#E6F4EA] text-[#137333] text-[8px] font-medium rounded-full inline-flex items-center justify-center leading-none">
                        Completed
                      </span>
                    ) : isInProgress ? (
                      <span className="px-2 py-0.5 bg-[#FEF3C7] text-[#B45309] text-[8px] font-medium rounded-full inline-flex items-center justify-center leading-none">
                        In Progress
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[8px] font-medium rounded-full inline-flex items-center justify-center leading-none">
                        Not Started
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
