import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getExamResult } from "../../api/scholarshipExamApi";
import { useFirstPartyAnalytics } from "../../telemetry/legacyAnalytics";
import ScholarshipLevelPickerModal from "../../components/ScholarshipLevelPickerModal";
import { switchScholarshipToMode } from "../../utils/lgMode";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Clock,
  Award,
  Dumbbell,
  Sparkles,
  Phone,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import mayaThumbsup from "../../assets/onboarding/mayaThumbsup.webp";
import mayaShocked from "../../assets/onboarding/mayaShocked.webp";
import mayaSad from "../../assets/onboarding/mayaSad.webp";
import mayaSmiling from "../../assets/onboarding/mayaSmiling.webp";

/** B1-style top navigation row shared by every result state. */
function ResultTopBar({ title }) {
  const navigate = useNavigate();
  return (
    <div
      className="px-4 pb-2.5"
      style={{ paddingTop: "calc(0.625rem + env(safe-area-inset-top, 0px))" }}
    >
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/scholarship")}
          className="flex items-center gap-2 text-sm font-semibold text-[#181d27]"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <span className="text-sm font-semibold text-[#7b7b7b]">{title}</span>
      </div>
    </div>
  );
}

/**
 * Scholarship result screen. Two modes:
 *  - Results released  → full score + award voucher / practice funnel.
 *  - Results awaited   → "results awaited" state with the option to switch to
 *    learning or practicing mode (opens the level-picker modal).
 */
export default function ScholarshipResult() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const analytics = useFirstPartyAnalytics();

  const [loading, setLoading] = useState(true);
  const [resultsAwaited, setResultsAwaited] = useState(false);
  const [error, setError] = useState(null);
  const [exam, setExam] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [percentile, setPercentile] = useState(null);
  const [picker, setPicker] = useState(null); // "learn" | "practice" | null
  const [nowTick, setNowTick] = useState(Date.now());
  const user = useSelector((state) => state.auth.user);
  const expiresAt = exam?.redemption_expires_at;
  const awarded = submission?.awarded_scholarship_pct;
  const isEligible = awarded != null && Number(awarded) > 0;

  // Only the eligible-and-unexpired screen renders a countdown.
  useEffect(() => {
    if (!expiresAt || !isEligible) return;
    const end = new Date(expiresAt).getTime();
    if (!(Date.now() < end)) return;
    const id = setInterval(() => {
      setNowTick(Date.now());
      if (Date.now() >= end) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt, isEligible]);

  // Level picker logic for candidates who haven't assigned a German proficiency level
  const needsLevel =
    !!user?.scholarship_candidate_at &&
    user?.lg_preferred_mode === "scholarship";

  const goToMode = (mode, freshUser) => {
    const dest = mode === "learn" ? "/learn-german" : "/";
    const target = freshUser || user;
    if (target && !target.trial_taken) {
      navigate("/trial-offer", { replace: true, state: { from: dest } });
      return;
    }
    navigate(dest);
  };

  const handleModeHandoff = async (mode) => {
    if (needsLevel) {
      setPicker(mode);
      return;
    }
    const freshUser = await switchScholarshipToMode(mode);
    goToMode(mode, freshUser);
  };

  useEffect(() => {
    let cancelled = false;
    const fetchResult = async () => {
      try {
        const res = await getExamResult(testId);
        if (cancelled) return;
        setExam(res.data?.exam);
        setSubmission(res.data?.submission);
        setPercentile(res.data?.percentile ?? null);
        analytics?.capture("scholarship_result_viewed", {
          feature_key: "scholarship_exam",
          exam_id: testId,
          exam_title: res.data?.exam?.title,
          results_visible: true,
          awarded_pct: res.data?.submission?.awarded_scholarship_pct ?? null,
          is_eligible:
            res.data?.submission?.awarded_scholarship_pct != null &&
            Number(res.data?.submission?.awarded_scholarship_pct) > 0,
          percentile: res.data?.percentile ?? null,
        });
      } catch (err) {
        if (cancelled) return;
        if (
          err.response?.status === 403 &&
          err.response?.data?.results_awaited
        ) {
          setResultsAwaited(true);
        } else {
          setError(err.response?.data?.msg || "Failed to load result");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchResult();
    return () => {
      cancelled = true;
    };
  }, [analytics, testId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <ResultTopBar title="Result" />
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
          <p className="text-xs text-gray-400 font-medium mt-3">
            Loading result...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <ResultTopBar title="Result" />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <img
            src={mayaSad}
            alt=""
            className="w-28 h-28 object-contain mb-4 opacity-90"
          />
          <p className="text-gray-700 text-lg font-medium mb-4">{error}</p>
          <button
            onClick={() => navigate("/scholarship")}
            className="px-6 py-2 bg-[#002856] text-white rounded-xl font-semibold"
          >
            Back to Exam
          </button>
        </div>
      </div>
    );
  }

  // ── Results awaited state ───────────────────────────────────────────────
  if (resultsAwaited) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <ResultTopBar title="Scholarship Exam" />

        {/* Banner with white fade */}
        <div className="relative h-[150px] w-full overflow-hidden bg-gradient-to-br from-[#002856] via-[#0a3d7a] to-[#153A71]">
          <div>
            <div className="absolute -right-10 -top-10 w-44 h-44 bg-[#edb843] opacity-10 rounded-full blur-3xl" />
            <div className="absolute -left-12 -bottom-16 w-52 h-52 bg-[#1E76F3] opacity-20 rounded-full blur-3xl" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />
          </div>
          <img
            src={mayaShocked}
            alt="Maya cheering"
            className="absolute right-6 bottom-0 h-[150px] object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]"
          />
        </div>

        {/* Title */}
        <div className="px-4 pt-4 pb-4">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[rgba(237,184,67,0.18)] text-[#ac8121] text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3" /> Well done — exam submitted!
          </span>
          <h1 className="text-[26px] font-semibold text-[#002856] leading-[34px] mt-1.5">
            Results awaited
          </h1>
          <p className="text-xs text-black opacity-70 mt-1 leading-relaxed">
            Your answers have been recorded successfully. The scholarship team
            is reviewing submissions and will release results soon.
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 pb-8">
          <div className="bg-white border border-[#dbdbdb] rounded-xl p-4">
            <p className="text-sm font-bold text-[#181d27] mb-1">
              While you wait…
            </p>
            <p className="text-xs text-[#7b7b7b] mb-4">
              Keep learning or practicing German so you're ready for what's
              next.
            </p>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => handleModeHandoff("practice")}
                className="w-full p-4 rounded-xl border border-[#dbdbdb] hover:border-[#002856] hover:shadow-md transition flex items-center gap-3 text-left group"
              >
                <span className="w-11 h-11 rounded-xl bg-[#edb843] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Dumbbell className="w-5 h-5 text-[#002856]" />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold text-[#181d27] text-sm">
                    Practice Your German
                  </span>
                  <span className="block text-xs text-[#7b7b7b]">
                    Flashcards, grammar, tests & more
                  </span>
                </span>
                <ChevronRight className="w-5 h-5 text-[#414651]" />
              </button>
            </div>
          </div>

          <button
            onClick={() => navigate("/scholarship")}
            className="w-full mt-4 px-6 py-3 text-[#002856] rounded-xl font-semibold hover:bg-gray-50 transition"
          >
            Back to Scholarship Exam
          </button>
        </div>

        {picker && (
          <ScholarshipLevelPickerModal
            mode={picker}
            onClose={() => setPicker(null)}
            onDone={(freshUser) => goToMode(picker, freshUser)}
          />
        )}
      </div>
    );
  }

  // ── Results released state ──────────────────────────────────────────────
  const isExpired = (() => {
    if (!expiresAt || !isEligible) return false;
    return new Date(expiresAt).getTime() <= nowTick;
  })();
  const timeLeft = (() => {
    if (!expiresAt || isExpired) return null;
    const diff = new Date(expiresAt).getTime() - nowTick;
    if (diff <= 0) return null;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    return { days, hours, mins, secs };
  })();
  const expiresDisplay = expiresAt
    ? new Date(expiresAt).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
      }) + " IST"
    : null;

  // Expired but was eligible → hide percentage, keep phone CTA + clean practice button
  if (isEligible && isExpired) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <ResultTopBar title="Scholarship Exam" />
        <div className="relative h-[150px] w-full overflow-hidden bg-gradient-to-br from-[#002856] via-[#0a3d7a] to-[#153A71]">
          <div>
            <div className="absolute -right-10 -top-10 w-44 h-44 bg-[#edb843] opacity-10 rounded-full blur-3xl" />
            <div className="absolute -left-12 -bottom-16 w-52 h-52 bg-[#1E76F3] opacity-20 rounded-full blur-3xl" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />
          </div>
          <img
            src={mayaSad}
            alt=""
            className="absolute right-6 bottom-0 h-[150px] object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]"
          />
        </div>
        <div className="flex-1 px-4 pt-6 pb-10 text-center flex flex-col">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-50 text-red-600 text-[11px] font-bold uppercase tracking-wider mx-auto">
            Offer expired
          </span>
          <h1 className="text-[22px] font-bold text-[#181d27] mt-4 leading-snug">
            Offer expired
          </h1>
          <p className="text-sm text-[#7b7b7b] mt-3 leading-relaxed">
            Your scholarship window closed on {expiresDisplay}. Contact our team
            to explore next steps.
          </p>

          <div className="mt-6 space-y-3">
            <a
              href="tel:+919972266767"
              onClick={() =>
                analytics?.capture("scholarship_contact_cta_clicked", {
                  feature_key: "scholarship_exam",
                  exam_id: testId,
                  awarded_pct: Number(awarded),
                  percentile,
                  expired: true,
                })
              }
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#002856] text-white rounded-xl font-bold hover:bg-[#001e40] transition"
            >
              <Phone className="w-4 h-4" />
              <span>Contact SkillCase Team</span>
            </a>

            <button
              onClick={() => handleModeHandoff("practice")}
              className="w-full py-3 px-4 border border-[#dbdbdb] text-[#002856] font-semibold text-xs rounded-xl hover:bg-slate-50 transition flex items-center justify-center gap-1.5"
            >
              <Dumbbell className="w-4 h-4 text-[#edb843]" />
              <span>Continue Practicing German</span>
            </button>
          </div>

          <button
            onClick={() => navigate("/scholarship")}
            className="w-full mt-3 px-6 py-2 text-slate-500 text-xs font-semibold hover:bg-gray-50 transition"
          >
            Back to Scholarship
          </button>
        </div>

        {picker && (
          <ScholarshipLevelPickerModal
            mode={picker}
            onClose={() => setPicker(null)}
            onDone={(freshUser) => goToMode(picker, freshUser)}
          />
        )}
      </div>
    );
  }

  // ── Negative Result (No scholarship / Did not qualify) ──────────────────
  if (!isEligible) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <ResultTopBar title="Scholarship Exam" />
        <div className="relative h-[150px] w-full overflow-hidden bg-gradient-to-br from-[#002856] via-[#0a3d7a] to-[#153A71]">
          <div>
            <div className="absolute -right-10 -top-10 w-44 h-44 bg-[#edb843] opacity-10 rounded-full blur-3xl" />
            <div className="absolute -left-12 -bottom-16 w-52 h-52 bg-[#1E76F3] opacity-20 rounded-full blur-3xl" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />
          </div>
          <img
            src={mayaSmiling}
            alt="Maya smiling"
            className="absolute right-6 bottom-0 h-[150px] object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]"
          />
        </div>

        <div className="px-4 pt-4 pb-4">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
            Exam Completed
          </span>
          <h1 className="text-[26px] font-semibold text-[#002856] leading-[34px] mt-1.5">
            Good effort on your exam!
          </h1>
          <p className="text-xs text-black opacity-70 mt-1 leading-relaxed">
            You didn&apos;t reach the scholarship cut-off this time, but daily
            practice is the fastest way to build fluency.
          </p>
        </div>

        <div className="flex-1 px-4 pb-8 space-y-3">
          <button
            onClick={() => handleModeHandoff("practice")}
            className="w-full p-4 rounded-xl border border-[#dbdbdb] hover:border-[#002856] hover:shadow-sm transition flex items-center gap-3 text-left group bg-white"
          >
            <span className="w-11 h-11 rounded-xl bg-[#edb843] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Dumbbell className="w-5 h-5 text-[#002856]" />
            </span>
            <span className="flex-1">
              <span className="block font-semibold text-[#181d27] text-sm">
                Practice Your German
              </span>
              <span className="block text-xs text-[#7b7b7b]">
                Flashcards, grammar drills & tests
              </span>
            </span>
            <ChevronRight className="w-5 h-5 text-[#414651]" />
          </button>

          <button
            onClick={() => navigate("/scholarship")}
            className="w-full mt-3 px-6 py-3 text-[#002856] rounded-xl font-semibold hover:bg-gray-50 transition"
          >
            Back to Scholarship Exam
          </button>
        </div>

        {picker && (
          <ScholarshipLevelPickerModal
            mode={picker}
            onClose={() => setPicker(null)}
            onDone={(freshUser) => goToMode(picker, freshUser)}
          />
        )}
      </div>
    );
  }

  // ── Positive Result (Scholarship Awarded) ──────────────────────────────
  const pctDisplay = Number(awarded).toString().replace(/\.0$/, "");

  const handleContactClick = () => {
    analytics?.capture("scholarship_contact_cta_clicked", {
      feature_key: "scholarship_exam",
      exam_id: testId,
      awarded_pct: Number(awarded),
      percentile,
    });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <ResultTopBar title="Scholarship Exam" />

      {/* Hero Banner */}
      <div className="relative h-[150px] w-full overflow-hidden bg-gradient-to-br from-[#002856] via-[#0a3d7a] to-[#153A71]">
        <div>
          <div className="absolute -right-10 -top-10 w-44 h-44 bg-[#edb843] opacity-10 rounded-full blur-3xl" />
          <div className="absolute -left-12 -bottom-16 w-52 h-52 bg-[#1E76F3] opacity-20 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />
        </div>
        <img
          src={mayaThumbsup}
          alt="Maya cheering"
          className="absolute right-6 bottom-0 h-[150px] object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]"
        />
      </div>

      <div className="px-4 pt-4 pb-2">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[rgba(237,184,67,0.18)] text-[#ac8121] text-[10px] font-bold uppercase tracking-wider">
          <Sparkles className="w-3 h-3" /> Congratulations!
        </span>
        <h1 className="text-[26px] font-semibold text-[#002856] leading-[34px] mt-1.5">
          You&apos;re eligible for{" "}
          <span className="text-[#ac8121]">{pctDisplay}% scholarship</span>
        </h1>
        {percentile != null && (
          <p className="text-xs font-semibold text-[#019035] mt-1">
            You&apos;re above {percentile}% of candidates
          </p>
        )}
        <p className="text-xs text-black opacity-70 mt-1 leading-relaxed">
          Contact our admissions team to claim your scholarship and begin your
          course.
        </p>
      </div>

      <div className="flex-1 px-4 pb-8 space-y-4">
        {/* Clean Award Card */}
        <div className="bg-white border border-[#dbdbdb] rounded-xl px-5 py-4 text-center">
          <div className="text-5xl font-bold leading-none text-[#002856]">
            {pctDisplay}%
          </div>
          <p className="text-[#7b7b7b] text-sm mt-1.5">scholarship awarded</p>

          {expiresAt && !isExpired && timeLeft && (
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-center gap-1.5 text-xs text-amber-700 font-semibold">
              <Clock className="w-3.5 h-3.5" />
              <span>
                Redeem within {timeLeft.days > 0 ? `${timeLeft.days}d ` : ""}
                {String(timeLeft.hours).padStart(2, "0")}:
                {String(timeLeft.mins).padStart(2, "0")}:
                {String(timeLeft.secs).padStart(2, "0")}
              </span>
            </div>
          )}
        </div>

        {/* Action Stack */}
        <div className="space-y-2.5">
          <a
            href="tel:+919972266767"
            onClick={handleContactClick}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#002856] text-white rounded-xl font-bold hover:bg-[#001e40] transition"
          >
            <Phone className="w-4 h-4" />
            <span>Contact SkillCase Team</span>
          </a>

          <button
            onClick={() => handleModeHandoff("practice")}
            className="w-full p-3.5 rounded-xl border border-[#dbdbdb] hover:border-[#002856] transition flex items-center justify-between text-left group bg-white"
          >
            <div className="flex items-center gap-2.5">
              <Dumbbell className="w-4 h-4 text-[#002856]" />
              <span className="font-semibold text-[#181d27] text-xs">
                Practice German while you wait
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-[#7b7b7b]" />
          </button>
        </div>

        <button
          onClick={() => navigate("/scholarship")}
          className="w-full mt-2 py-2 text-[#002856] text-xs font-semibold text-center hover:bg-gray-50 rounded-xl transition"
        >
          Back to Scholarship
        </button>
      </div>

      {picker && (
        <ScholarshipLevelPickerModal
          mode={picker}
          onClose={() => setPicker(null)}
          onDone={(freshUser) => goToMode(picker, freshUser)}
        />
      )}
    </div>
  );
}
