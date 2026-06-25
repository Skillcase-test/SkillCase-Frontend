import React, { useState } from "react";
import {
  Calendar,
  Video,
  Clock,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
  Hourglass,
  ClipboardCheck,
  MessageSquare,
  UserCheck,
} from "lucide-react";
import { getProgress } from "../../../api/jobScreeningApi";
import mayaShocked from "../../../assets/onboarding/mayaShocked.webp";

const MeetingStep = ({ type, progress, onComplete, onBack }) => {
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
        const currentStepId = isTraining
          ? "interview_training"
          : "recruiter_interview";
        const hasStepChanged = data.data?.current_step_id !== currentStepId;
        onComplete(data.data, hasStepChanged);
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

  const getFormattedDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getFormattedTimeRange = (dateStr) => {
    if (!dateStr) return "";
    const start = new Date(dateStr);
    if (isNaN(start.getTime())) return dateStr;

    const formatTime = (dateObj) => {
      let hours = dateObj.getHours();
      const minutes = String(dateObj.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${hours}:${minutes} ${ampm}`;
    };

    const startTimeStr = formatTime(start);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const endTimeStr = formatTime(end);

    return `${startTimeStr} - ${endTimeStr}`;
  };

  const handleAddToCalendar = () => {
    if (!slotTime) return;
    const start = new Date(slotTime);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const title = "Skillcase Interview Training Call";
    const details =
      "Come prepared with your CV and 2-3 questions to ask your mentor.";

    const formatCalendarTime = (date) => {
      return date.toISOString().replace(/-|:|\.\d\d\d/g, "");
    };

    const dates = `${formatCalendarTime(start)}/${formatCalendarTime(end)}`;
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      title,
    )}&dates=${dates}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(
      meetLink || "",
    )}`;
    window.open(googleCalendarUrl, "_blank");
  };

  const bookingUrl =
    progress?.training_booking_url ||
    progress?.globalSettings?.training_booking_url;

  // Render logic for training
  if (isTraining) {
    if (isFailed) {
      return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm/30 p-6 sm:p-8 flex flex-col items-center justify-center text-center w-full font-sans">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center text-red-600 mx-auto mb-5">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-red-600 tracking-tight mb-2">
            Mentoring Session Failed
          </h2>
          <p className="text-zinc-500 text-xs sm:text-sm max-w-sm mx-auto leading-relaxed mb-4">
            Unfortunately, you did not pass the mentoring/training session
            checkpoint. We are here to support your growth. Reach out to
            Skillcase support at +919731462667 to receive detailed feedback and
            guidance on next steps.
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
        <div className="w-full bg-white text-[#002856] flex flex-col items-start justify-start relative font-sans">
          <div className="w-full flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-slate-800 text-sm font-semibold hover:text-black cursor-pointer bg-transparent border-none p-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <span className="text-slate-400 text-sm font-semibold">
              Job Progress
            </span>
          </div>

          <div className="w-full flex flex-col justify-start items-start gap-3 mb-6 text-left">
            <h2 className="text-[#002856] text-2xl font-bold tracking-tight">
              Interview training
            </h2>
            <p className="text-[#002856]/70 text-base font-medium leading-relaxed">
              Prepare for your final job interviews with comprehensive live
              tutoring and prep sessions led by industry experts.
            </p>
          </div>

          <div className="w-full p-4 bg-white rounded-2xl border border-slate-200 flex flex-col gap-4 text-left mb-6 shadow-sm">
            <div className="flex justify-between items-center w-full">
              <h3 className="text-[#002856] text-base font-semibold leading-tight">
                Points to remember
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-green-50 text-[#15803d] border border-green-100">
                in progress
              </span>
            </div>

            <div className="flex flex-col gap-5">
              <div className="flex justify-start items-start gap-4">
                <div className="w-10 h-10 bg-black/5 rounded-lg flex items-center justify-center shrink-0">
                  <Hourglass className="w-4 h-4 text-[#002856]" />
                </div>
                <div className="flex-1 flex flex-col justify-start items-start">
                  <h4 className="text-[#002856] text-sm font-semibold leading-tight">
                    One-on-one training
                  </h4>
                  <p className="text-slate-500 text-xs mt-1 leading-normal">
                    Schedule personalized coaching sessions with senior tech
                    mentors to refine your presentation.
                  </p>
                </div>
              </div>

              <div className="flex justify-start items-start gap-4">
                <div className="w-10 h-10 bg-black/5 rounded-lg flex items-center justify-center shrink-0">
                  <ClipboardCheck className="w-4 h-4 text-[#002856]" />
                </div>
                <div className="flex-1 flex flex-col justify-start items-start">
                  <h4 className="text-[#002856] text-sm font-semibold leading-tight">
                    Expert guidance
                  </h4>
                  <p className="text-slate-500 text-xs mt-1 leading-normal">
                    Receive tips directly from recruiters who know exactly what
                    European companies look for.
                  </p>
                </div>
              </div>

              <div className="flex justify-start items-start gap-4">
                <div className="w-10 h-10 bg-black/5 rounded-lg flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4 text-[#002856]" />
                </div>
                <div className="flex-1 flex flex-col justify-start items-start">
                  <h4 className="text-[#002856] text-sm font-semibold leading-tight">
                    Feedback on your interview
                  </h4>
                  <p className="text-slate-500 text-xs mt-1 leading-normal">
                    Get an in-depth performance analysis to understand areas of
                    improvement before client talks.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full bg-white rounded-2xl border border-slate-200/80 flex items-center gap-3.5 shadow-sm text-left mb-6">
            <img
              src={mayaShocked}
              alt="Mascot Alert"
              className="w-20 h-20 object-contain shrink-0 select-none"
              draggable="false"
            />
            <div className="min-w-0 flex-1 py-3 pr-4">
              <h5 className="text-slate-800 text-xs sm:text-sm font-bold">
                Please note
              </h5>
              <p className="text-slate-500 text-[10px] sm:text-xs mt-0.5 leading-normal">
                We will ask for camera and mic access on the next screen.
                Nothing is recorded until you press start.
              </p>
            </div>
          </div>

          {bookingUrl ? (
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-12 bg-[#002856] hover:bg-[#001c3d] text-white rounded-lg shadow-sm font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer text-center"
            >
              Schedule a training call
            </a>
          ) : (
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="w-full h-12 bg-[#002856] hover:bg-[#001c3d] text-white rounded-lg shadow-sm font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="animate-spin w-4 h-4" />
                  <span>Checking Slot...</span>
                </>
              ) : (
                <span>Check schedule of training call</span>
              )}
            </button>
          )}
        </div>
      );
    }

    // Scheduled view for training
    return (
      <div className="w-full bg-white text-[#002856] flex flex-col items-start justify-start relative font-sans">
        <div className="w-full flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-slate-800 text-sm font-semibold hover:text-black cursor-pointer bg-transparent border-none p-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <span className="text-slate-400 text-sm font-semibold">
            Job Progress
          </span>
        </div>

        <div className="w-full px-5 pt-10 pb-5 bg-gradient-to-b from-[#e0f2fe] to-[#f0f9ff] rounded-2xl border border-white/20 flex flex-col items-center gap-6">
          <div className="w-12 h-12 bg-blue-950 rounded-xl flex items-center justify-center text-white shrink-0">
            <Calendar className="w-6 h-6" />
          </div>

          <div className="text-center w-full">
            <h2 className="text-[#002856] text-2xl font-bold tracking-tight">
              Your training call has been scheduled
            </h2>
            <p className="text-[#002856]/70 text-xs sm:text-sm font-medium mt-2 max-w-[280px] mx-auto leading-relaxed">
              Your preparation webinar has been confirmed. Please find your
              event details below.
            </p>
          </div>

          <div className="w-full flex flex-col items-start pl-1 gap-5 mt-2 py-4 rounded-xl">
            <div className="w-full max-w-[280px] flex flex-col gap-4">
              <div className="flex justify-start items-start gap-4">
                <div className="w-10 h-10 bg-[#002856]/5 rounded-lg flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-[#002856]" />
                </div>
                <div className="flex-1 flex flex-col justify-start items-start text-left">
                  <span className="opacity-70 text-black text-[10px] font-bold uppercase tracking-wider">
                    DATE
                  </span>
                  <span className="text-[#002856] text-base font-semibold mt-0.5">
                    {getFormattedDate(slotTime)}
                  </span>
                </div>
              </div>

              <div className="flex justify-start items-start gap-4">
                <div className="w-10 h-10 bg-[#002856]/5 rounded-lg flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-[#002856]" />
                </div>
                <div className="flex-1 flex flex-col justify-start items-start text-left">
                  <span className="opacity-70 text-black text-[10px] font-bold uppercase tracking-wider">
                    TIME
                  </span>
                  <span className="text-[#002856] text-base font-semibold mt-0.5">
                    {getFormattedTimeRange(slotTime)}
                  </span>
                </div>
              </div>

              <div className="flex justify-start items-start gap-4">
                <div className="w-10 h-10 bg-[#002856]/5 rounded-lg flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4 text-[#002856]" />
                </div>
                <div className="flex-1 flex flex-col justify-start items-start text-left">
                  <span className="opacity-70 text-black text-[10px] font-bold uppercase tracking-wider">
                    MENTOR
                  </span>
                  <span className="text-[#002856] text-base font-semibold mt-0.5">
                    {progress?.training_mentor || "Skillcase Mentor"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full bg-white rounded-2xl border border-slate-200/80 flex items-center gap-3.5 shadow-sm text-left">
            <img
              src={mayaShocked}
              alt="Mascot Alert"
              className="w-20 h-20 object-contain shrink-0 select-none"
              draggable="false"
            />
            <div className="min-w-0 flex-1 py-3 pr-4">
              <h5 className="text-slate-800 text-xs sm:text-sm font-bold">
                Please note
              </h5>
              <p className="text-slate-500 text-[10px] sm:text-xs mt-0.5 leading-normal">
                Come prepared with your CV and 2-3 questions to ask your mentor.
              </p>
            </div>
          </div>

          <div className="w-full flex flex-col gap-3">
            {meetLink ? (
              <a
                href={meetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-12 bg-[#002856] hover:bg-[#001c3d] text-white rounded-lg shadow-sm font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer text-center"
              >
                <Video className="w-4 h-4" />
                Join the meeting
              </a>
            ) : (
              <div className="w-full p-3 bg-yellow-50 text-yellow-800 rounded-xl border border-yellow-100 text-xs font-semibold text-center leading-relaxed">
                Meeting link is being generated. It will appear here shortly
                before the slot time.
              </div>
            )}

            <button
              onClick={handleAddToCalendar}
              className="w-full h-12 bg-white hover:bg-slate-50 text-[#002856] border border-[#002856] rounded-lg shadow-sm font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
            >
              Add to your calendar
            </button>

            <button
              onClick={handleRefresh}
              disabled={loading}
              className="w-full h-10 bg-transparent text-[#002856] hover:underline rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3 h-3 ${loading ? "animate-spin" : ""}`}
              />
              Refresh Details
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Recruiter interview original view
  if (isFailed) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm/30 p-6 sm:p-8 flex flex-col items-center justify-center text-center w-full font-sans">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center text-red-600 mx-auto mb-5">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-red-600 tracking-tight mb-2">
          Recruiter Interview Failed
        </h2>
        <p className="text-zinc-500 text-xs sm:text-sm max-w-sm mx-auto leading-relaxed mb-4">
          Unfortunately, you did not pass the recruiter interview checkpoint. We
          are here to support your growth. Reach out to Skillcase support at
          +919731462667 to receive detailed feedback and guidance on next steps.
        </p>
        <a
          href="tel:+919731462667"
          className="mb-6 w-full sm:max-w-xs h-11 bg-[#002856] text-white hover:bg-[#003975] rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all shadow-sm cursor-pointer mx-auto"
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
          Scheduling Recruiter Interview
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
        Live Recruiter Interview
      </h2>
      <p className="text-zinc-500 text-xs sm:text-sm max-w-sm mx-auto leading-relaxed mb-6">
        Connect live with our hiring recruiters for final job evaluations.
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
            className="w-full h-11 bg-gradient-to-r from-amber-200 to-amber-300 text-[#002856] border border-[#eec139] hover:from-amber-300 hover:to-amber-400 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-amber-200/10 hover:shadow-lg hover:shadow-amber-200/20 active:scale-[0.99] transition-all text-center"
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
