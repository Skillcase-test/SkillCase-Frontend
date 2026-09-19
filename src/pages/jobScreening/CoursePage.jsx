import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { getProgress, optInCrashCourse } from "../../api/jobScreeningApi";
import { trackFeatureEvent } from "../../telemetry/events";
import CourseOptedIn from "./components/CourseOptedIn";
import mayaShocked from "../../assets/onboarding/mayaShocked.webp";
import { COURSE } from "../../config/course";

const INCLUDED = [
  "Grammar & sentence correction",
  "German response practice",
  "Work on your identified weak areas",
  "Mock interviews & personalised feedback",
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
        // Only failed candidates belong here — anyone else bounces to the lobby.
        if (data?.data?.interview_review_status !== "rejected") {
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

  if (optedIn) {
    return (
      <div
        className="min-h-screen bg-white w-full flex flex-col items-center px-4 pb-12 overflow-y-auto"
        style={{
          paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))",
          paddingBottom: "calc(3rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="w-full max-w-md">
          <CourseOptedIn onDone={() => navigate("/job-screening")} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white w-full flex flex-col items-center">
      {/* Top Header matching SupportWidget */}
      <div
        className="w-full bg-white flex justify-center px-4 pb-3 shrink-0"
        style={{
          paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))",
        }}
      >
        <div className="w-full max-w-md flex items-center justify-start gap-3">
          <button
            type="button"
            onClick={() => navigate("/job-screening")}
            className="w-7 h-7 flex items-center justify-center rounded-md border-2 border-slate-400 text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-base font-semibold text-[#002856]">Programmes</h1>
        </div>
      </div>

      {/* Top Hero with downward linear gradient into white */}
      <div className="w-full bg-gradient-to-b from-[#dbeafe] via-[#eff6ff]/70 to-white flex justify-center px-4 pt-3 pb-6">
        <div className="w-full max-w-md flex flex-col gap-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex flex-col gap-3.5"
          >
            <img
              src={COURSE.image}
              alt={COURSE.name}
              className="w-full aspect-[16/9] rounded-2xl object-cover shadow-xs border border-blue-200/40 select-none"
              draggable="false"
            />
            <div className="flex flex-col gap-1 text-left">
              <h2 className="text-[#002856] text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
                {COURSE.name}
              </h2>
              <p className="text-[#002856]/70 text-sm sm:text-base font-medium">
                {COURSE.meta}
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        className="w-full max-w-md flex flex-col gap-4 px-4"
        style={{
          paddingBottom: "calc(3rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {/* What's included in the course */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="w-full p-4 sm:p-5 bg-blue-100/50 rounded-2xl border border-blue-200/30 flex flex-col gap-3.5 text-left"
        >
          <h3 className="text-slate-900 text-sm sm:text-base font-bold">
            What’s included in the course
          </h3>
          <div className="flex flex-col gap-2.5">
            {INCLUDED.map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <span className="w-4 h-4 rounded-full bg-[#15803d] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Check className="w-2.5 h-2.5 stroke-[3.5]" />
                </span>
                <p className="text-slate-800 text-xs sm:text-[13px] font-normal leading-normal">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Expert Advice Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full bg-white rounded-2xl shadow-xs border border-slate-200/80 pl-2.5 sm:pl-3.5 pr-3.5 sm:pr-4 py-2 flex items-center gap-3 text-left overflow-hidden relative"
        >
          <div className="shrink-0 self-end -mb-2 flex items-end justify-center">
            <img
              src={mayaShocked}
              alt=""
              aria-hidden="true"
              className="w-14 h-16 sm:w-16 sm:h-18 object-contain object-bottom shrink-0 select-none pointer-events-none translate-y-1"
              draggable="false"
            />
          </div>
          <div className="min-w-0 flex-1 py-1">
            <h4 className="text-slate-900 text-xs sm:text-sm font-semibold leading-tight">
              Expert Advice
            </h4>
            <p className="text-slate-500 text-[11px] sm:text-xs mt-0.5 leading-snug">
              Focus on your gaps and prepare for your next attempt.
            </p>
          </div>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="w-full flex flex-col gap-2 pt-2"
        >
          <button
            type="button"
            onClick={handleOptIn}
            disabled={optingIn}
            className="w-full h-12 bg-[#002856] hover:bg-[#07192f] text-white rounded-xl font-bold text-sm sm:text-base transition-all shadow-sm cursor-pointer border-none flex items-center justify-center disabled:opacity-60"
          >
            {optingIn ? "Starting..." : "Start your preparation"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/job-screening")}
            className="w-full h-12 bg-white hover:bg-slate-50 text-[#002856] border border-slate-300 rounded-xl font-bold text-sm sm:text-base transition-all shadow-2xs cursor-pointer flex items-center justify-center"
          >
            Go back
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default CoursePage;
