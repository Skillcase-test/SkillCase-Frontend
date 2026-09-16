import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { getProgress, optInCrashCourse } from "../../api/jobScreeningApi";
import { trackFeatureEvent } from "../../telemetry/events";
import CourseOptedIn from "./components/CourseOptedIn";
import mayaShocked from "../../assets/onboarding/mayaShocked.webp";

// Screen 2 of the low-score hold flow ("Explore curated courses" → here).
// Single curated programme for now — static copy, image slot left as a
// placeholder until the final asset lands.
const COURSE = {
  title: "German Speaking Crash Course",
  meta: "24 live sessions · 4 weeks · Interview-focused",
};

const INCLUDED = [
  "Daily live speaking practice with a trainer",
  "Mock job interviews with detailed feedback",
  "B1 vocabulary and phrase drills",
  "Fluency and pronunciation coaching",
  "Doubt support over WhatsApp",
];

const CoursePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [optingIn, setOptingIn] = useState(false);
  const [optedIn, setOptedIn] = useState(false);

  useEffect(() => {
    let active = true;
    getProgress()
      .then(({ data }) => {
        if (!active) return;
        // Only held candidates belong here — anyone else bounces to the lobby.
        if (!data?.data?.interview_below_threshold) {
          navigate("/job-screening", { replace: true });
          return;
        }
        if (data.data?.course_optin_at) setOptedIn(true);
      })
      .catch(() => {
        if (active) navigate("/job-screening", { replace: true });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  const handleOptIn = async () => {
    trackFeatureEvent("job_screening", "crash_course_optin", {
      entityType: "course",
      entityId: "german_speaking_crash_course",
      lifecycle: "started",
    });
    try {
      setOptingIn(true);
      const { data } = await optInCrashCourse();
      if (data?.success) {
        setOptedIn(true);
        trackFeatureEvent("job_screening", "crash_course_optin", {
          entityType: "course",
          entityId: "german_speaking_crash_course",
          lifecycle: "succeeded",
        });
      } else {
        toast.error("Couldn't opt in — please try again");
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Couldn't opt in — please try again",
      );
    } finally {
      setOptingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white w-full flex flex-col items-center pt-4 px-4 pb-24">
        <div className="w-full max-w-md flex flex-col gap-4 animate-pulse">
          <div className="h-8 w-40 bg-slate-100 rounded-lg" />
          <div className="aspect-video w-full bg-slate-100 rounded-2xl" />
          <div className="h-32 w-full bg-slate-100 rounded-2xl" />
          <div className="h-24 w-full bg-slate-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white w-full flex flex-col items-center">
      {/* Header */}
      <div
        className="w-full bg-white flex justify-center px-4 shrink-0"
        style={{
          paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))",
          paddingBottom: "0.75rem",
        }}
      >
        <div className="w-full max-w-md flex items-center justify-start gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-7 h-7 flex items-center justify-center rounded-md border-2 border-slate-400 text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-base font-semibold text-[#002856]">Programmes</h1>
        </div>
      </div>

      <div
        className="w-full max-w-md flex flex-col gap-5 px-4 pt-2"
        style={{
          paddingBottom: "calc(4rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {optedIn ? (
          <CourseOptedIn onDone={() => navigate("/job-screening")} />
        ) : (
          <>
            {/* Hero — image placeholder until the final asset lands */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full aspect-video rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-200/50 flex flex-col items-center justify-center gap-2 text-[#002856]/60"
            >
              <GraduationCap className="w-10 h-10" />
              <span className="text-xs font-medium">Course preview</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <h2 className="text-[#002856] text-2xl font-semibold tracking-tight">
                {COURSE.title}
              </h2>
              <p className="text-[#002856]/70 text-sm font-medium mt-1.5">
                {COURSE.meta}
              </p>
            </motion.div>

            {/* What's included */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="w-full p-4 sm:p-5 bg-blue-100/50 rounded-xl flex flex-col gap-3"
            >
              <h3 className="text-slate-900 text-sm sm:text-base font-semibold">
                What's included in the course
              </h3>
              <div className="flex flex-col gap-2">
                {INCLUDED.map((item) => (
                  <div key={item} className="flex items-center gap-2.5">
                    <span className="w-4 h-4 rounded-full bg-[#15803d] text-white flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3.5]" />
                    </span>
                    <p className="text-slate-700 text-xs sm:text-sm font-normal leading-normal">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Expert advice */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="w-full bg-white rounded-xl shadow-sm border border-slate-200 p-3 flex items-center gap-3"
            >
              <img
                src={mayaShocked}
                alt=""
                aria-hidden="true"
                className="w-14 h-16 object-contain shrink-0 select-none"
                draggable="false"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-slate-700 text-sm font-semibold leading-tight">
                  Expert advice
                </h4>
                <p className="text-slate-500 text-xs mt-1 leading-normal">
                  Our counsellors recommend this course — most candidates clear
                  the interview benchmark on their next review.
                </p>
              </div>
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="w-full flex flex-col gap-2 pt-2"
            >
              <button
                type="button"
                onClick={handleOptIn}
                disabled={optingIn}
                className="w-full h-12 bg-[#002856] hover:bg-[#07192f] text-white rounded-xl font-bold text-sm sm:text-base transition-all shadow-sm cursor-pointer border-none flex items-center justify-center disabled:opacity-60"
              >
                {optingIn ? "Opting you in..." : "Opt in for course"}
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-full h-12 bg-transparent text-[#002856] border border-slate-400 rounded-xl font-bold text-sm sm:text-base transition-all hover:bg-slate-50 cursor-pointer flex items-center justify-center"
              >
                Go back
              </button>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

export default CoursePage;
