import React, { useState } from "react";
import { Calendar, Video, Clock, RefreshCw, AlertCircle } from "lucide-react";
import { getProgress } from "../../../api/jobScreeningApi";

const MeetingStep = ({ type, progress, onComplete }) => {
  const [loading, setLoading] = useState(false);

  const isTraining = type === "training";
  const slotTime = isTraining
    ? progress?.training_slot_time
    : progress?.recruiter_slot_time;
  const meetLink = isTraining
    ? progress?.training_meet_link
    : progress?.recruiter_meet_link;
  const scheduleImage = isTraining
    ? progress?.trainingScheduleImageDownloadUrl
    : progress?.recruiterScheduleImageDownloadUrl;
  const isScheduled = !!slotTime || !!scheduleImage;

  const handleRefresh = async () => {
    try {
      setLoading(true);
      const { data } = await getProgress();
      if (data?.success) {
        onComplete(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isFailed = isTraining
    ? progress?.training_completed === false
    : progress?.recruiter_interview_passed === false;

  if (isFailed) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm/30 p-6 sm:p-8 flex flex-col items-center justify-center text-center w-full font-sans">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center text-red-600 mx-auto mb-5">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-red-600 tracking-tight mb-2">
          {isTraining
            ? "Mentoring Session Failed"
            : "Recruiter Interview Failed"}
        </h2>
        <p className="text-zinc-500 text-xs sm:text-sm max-w-sm mx-auto leading-relaxed mb-4">
          Unfortunately, you did not pass the{" "}
          {isTraining ? "mentoring/training session" : "recruiter interview"}{" "}
          checkpoint. We are here to support your growth. Reach out to Skillcase support at +919731462667 to receive detailed feedback and guidance on next steps.
        </p>
        <a
          href="tel:+919731462667"
          className="mb-6 w-full sm:max-w-xs h-11 bg-[#002856] text-white hover:bg-[#003975] rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all shadow-sm cursor-pointer"
        >
          Call Skillcase Support
        </a>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="w-full sm:max-w-xs h-11 border-2 border-zinc-200 bg-white text-[#002856] hover:bg-zinc-50 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Refresh Status
        </button>
      </div>
    );
  }

  if (!isScheduled) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm/30 p-6 sm:p-8 flex flex-col items-center justify-center text-center w-full font-sans">
        <div className="w-14 h-14 rounded-full bg-blue-50/50 flex items-center justify-center text-[#002856] mx-auto mb-5 animate-pulse">
          <Calendar className="w-7 h-7" />
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-[#002856] tracking-tight mb-2">
          {isTraining
            ? "Scheduling Training Session"
            : "Scheduling Recruiter Interview"}
        </h2>
        <p className="text-zinc-500 text-xs sm:text-sm max-w-sm mx-auto leading-relaxed mb-6">
          Our scheduling coordinators are assigning a slot and setting up a
          Google Meet link for you. Please check back in a few minutes or click
          the refresh button below to sync updates.
        </p>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="w-full sm:max-w-xs h-11 border-2 border-zinc-200 bg-white text-[#002856] hover:bg-zinc-50 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Check Schedule
        </button>
      </div>
    );
  }

  const dateObj = new Date(slotTime);
  const formattedDate = dateObj.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = dateObj.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm/30 p-6 sm:p-8 flex flex-col items-center justify-center text-center w-full font-sans">
      <div className="w-14 h-14 rounded-full bg-blue-50/50 flex items-center justify-center text-[#002856] mx-auto mb-5">
        <Calendar className="w-7 h-7" />
      </div>

      <h2 className="text-xl sm:text-2xl font-extrabold text-[#002856] tracking-tight mb-2">
        {isTraining ? "Interview Training Session" : "Live Recruiter Interview"}
      </h2>
      <p className="text-zinc-500 text-xs sm:text-sm max-w-sm mx-auto leading-relaxed mb-6">
        {isTraining
          ? "Join your preparation classes with a senior mentor to master interview skills."
          : "Connect live with our hiring recruiters for final job evaluations."}
      </p>

      {scheduleImage ? (
        <div className="w-full flex justify-center mb-6">
          <img
            src={scheduleImage}
            alt="Schedule"
            className="w-auto max-w-[320px] max-h-[260px] object-contain rounded-2xl border border-slate-100 shadow-sm bg-white"
          />
        </div>
      ) : (
        <div className="w-full max-w-xs border border-slate-100 rounded-2xl p-4 bg-slate-50/20 mb-6 flex flex-col gap-3.5 text-left">
          <div className="flex items-start gap-3">
            <Calendar className="w-4.5 h-4.5 text-[#002856] mt-0.5 shrink-0" />
            <div>
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">
                Date
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-800">
                {formattedDate}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="w-4.5 h-4.5 text-[#002856] mt-0.5 shrink-0" />
            <div>
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">
                Time
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-800">
                {formattedTime}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 w-full sm:max-w-xs">
        {meetLink ? (
          <a
            href={meetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-11 bg-gradient-to-r from-amber-200 to-amber-300 text-[#002856] border border-[#eec139] hover:from-amber-300 hover:to-amber-400 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-amber-200/10 hover:shadow-lg hover:shadow-amber-200/20 active:scale-[0.99] transition-all"
          >
            <Video className="w-4 h-4" />
            Join Google Meet
          </a>
        ) : (
          <div className="p-3 bg-yellow-50 text-yellow-800 rounded-xl border border-yellow-100 text-xs font-semibold text-center leading-relaxed">
            Meeting link is being generated. It will appear here shortly before
            the slot time.
          </div>
        )}

        <button
          onClick={handleRefresh}
          disabled={loading}
          className="w-full h-11 border-2 border-zinc-200 bg-white text-[#002856] hover:bg-zinc-50 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Refresh Details
        </button>
      </div>
    </div>
  );
};

export default MeetingStep;
