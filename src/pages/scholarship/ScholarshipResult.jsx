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
} from "lucide-react";
import mayaThumbsup from "../../assets/onboarding/mayaThumbsup.webp";
import mayaShocked from "../../assets/onboarding/mayaShocked.webp";
import mayaSad from "../../assets/onboarding/mayaSad.webp";

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
 *  - Results released  → full score + answer review (mirrors ExamResult).
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

  // Only the eligible-and-unexpired screen renders a countdown. Without this
  // gate the whole page re-rendered every second for candidates who can never
  // see one, and kept ticking forever after the window closed.
  useEffect(() => {
    if (!expiresAt || !isEligible) return;
    const end = new Date(expiresAt).getTime();
    if (!(Date.now() < end)) return; // already expired (or unparseable)
    const id = setInterval(() => {
      setNowTick(Date.now());
      if (Date.now() >= end) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt, isEligible]);

  // The level picker exists to replace the placeholder A1 that scholarship
  // onboarding assigns. Anyone who reached the exam from an existing
  // learn/practice account (admin-added candidates, or a candidate who already
  // picked a level once and came back) has a real level, so asking again would
  // demote them — hand them straight back to their mode instead.
  const needsLevel =
    !!user?.scholarship_candidate_at &&
    user?.lg_preferred_mode === "scholarship";

  // Shared by the picker and the skip path: a candidate who never took their
  // free trial sees the trial offer before the hub (same gate as onboarding).
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
    // No level argument: their existing proficiency level stays untouched.
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

  // Expired but was eligible → hide percentage, keep CTA
  if (isEligible && isExpired) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <ResultTopBar title="Scholarship Exam" />
        <div className="relative h-[140px] w-full overflow-hidden bg-gradient-to-br from-[#002856] via-[#0a3d7a] to-[#153A71]">
          <div>
            <div className="absolute -right-10 -top-10 w-44 h-44 bg-[#edb843] opacity-10 rounded-full blur-3xl" />
            <div className="absolute -left-12 -bottom-16 w-52 h-52 bg-[#1E76F3] opacity-20 rounded-full blur-3xl" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />
          </div>
          <img src={mayaSad} alt="" className="absolute right-6 bottom-0 h-[140px] object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]" />
        </div>
        <div className="flex-1 px-4 pt-6 pb-10 text-center">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-50 text-red-600 text-[11px] font-bold uppercase tracking-wider">
            Offer expired
          </span>
          <h1 className="text-[22px] font-bold text-[#181d27] mt-4 leading-snug">Offer expired</h1>
          <p className="text-sm text-[#7b7b7b] mt-3 leading-relaxed">
            Your scholarship window closed on {expiresDisplay}. Contact our team to explore next steps.
          </p>
          <a
            href="tel:+919972266767"
            onClick={() => analytics?.capture("scholarship_contact_cta_clicked", { feature_key: "scholarship_exam", exam_id: testId, awarded_pct: Number(awarded), percentile, expired: true })}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#002856] text-white rounded-xl font-bold hover:bg-[#001e40] transition"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" /></svg>
            Contact SkillCase Team
          </a>
          <button onClick={() => navigate("/scholarship")} className="w-full mt-3 px-6 py-3 text-[#002856] rounded-xl font-semibold hover:bg-gray-50 transition">Back to Scholarship</button>
        </div>
      </div>
    );
  }

  if (!isEligible) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <ResultTopBar title="Scholarship Exam" />
        <div className="relative h-[140px] w-full overflow-hidden bg-gradient-to-br from-[#002856] via-[#0a3d7a] to-[#153A71]">
          <div>
            <div className="absolute -right-10 -top-10 w-44 h-44 bg-[#edb843] opacity-10 rounded-full blur-3xl" />
            <div className="absolute -left-12 -bottom-16 w-52 h-52 bg-[#1E76F3] opacity-20 rounded-full blur-3xl" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />
          </div>
          <img
            src={mayaSad}
            alt=""
            className="absolute right-6 bottom-0 h-[140px] object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]"
          />
        </div>
        <div className="flex-1 px-4 pt-6 pb-10 text-center">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
            {exam?.title || "Scholarship Exam"}
          </span>
          <h1 className="text-[22px] font-bold text-[#181d27] mt-4 leading-snug">
            Thanks for taking the scholarship exam.
          </h1>
          <p className="text-sm text-[#7b7b7b] mt-3 leading-relaxed">
            Unfortunately, you didn&apos;t qualify for a scholarship this time.
            Keep practicing — we&apos;d love to see you back.
          </p>
          {submission?.finished_at && (
            <p className="text-xs text-[#9ca3af] mt-4 inline-flex items-center gap-1 justify-center">
              <Clock className="w-3.5 h-3.5" />
              Submitted{" "}
              {new Date(submission.finished_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          )}
          <button
            onClick={() => navigate("/learn-german")}
            className="w-full mt-8 px-6 py-3 border border-slate-200 text-[#002856] rounded-xl font-semibold hover:bg-slate-50 transition"
          >
            Back to SkillCase
          </button>
        </div>
      </div>
    );
  }

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

      <div className="relative h-[140px] w-full overflow-hidden bg-gradient-to-br from-[#002856] via-[#0a3d7a] to-[#153A71]">
        <div>
          <div className="absolute -right-10 -top-10 w-44 h-44 bg-[#edb843] opacity-10 rounded-full blur-3xl" />
          <div className="absolute -left-12 -bottom-16 w-52 h-52 bg-[#1E76F3] opacity-20 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />
        </div>
        <img
          src={mayaThumbsup}
          alt="Maya giving a thumbs up"
          className="absolute right-6 bottom-0 h-[140px] object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]"
        />
      </div>

      <div className="flex-1 px-4 pt-4 pb-10">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[rgba(237,184,67,0.18)] text-[#ac8121] text-[10px] font-bold uppercase tracking-wider">
          <Sparkles className="w-3 h-3" /> Congratulations!
        </span>
        <h1 className="text-[26px] font-bold text-[#002856] leading-[34px] mt-2">
          You&apos;re eligible for <span className="text-[#ac8121]">{pctDisplay}% scholarship</span>
        </h1>
        {percentile != null && (
          <p className="text-sm font-semibold text-green-700 mt-1">
            You&apos;re above {percentile}% of candidates
          </p>
        )}
        <p className="text-xs text-black opacity-70 mt-2 leading-relaxed">
          To redeem, contact our admissions team. We&apos;ll guide you through the next steps.
        </p>
        {expiresAt && !isExpired && timeLeft && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Redeem within</p>
            <p className="text-lg font-bold text-[#002856] tabular-nums">
              {timeLeft.days > 0 ? `${timeLeft.days}d ` : ""}{String(timeLeft.hours).padStart(2, "0")}:
              {String(timeLeft.mins).padStart(2, "0")}:{String(timeLeft.secs).padStart(2, "0")}
            </p>
            <p className="text-[11px] text-slate-500">Valid till {expiresDisplay}</p>
          </div>
        )}
        {expiresAt && !isExpired && !timeLeft && (
          <p className="text-[11px] text-slate-500 mt-2">Valid till {expiresDisplay}</p>
        )}
        {submission?.finished_at && (
          <p className="text-xs text-[#9ca3af] mt-3 inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Submitted{" "}
            {new Date(submission.finished_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        )}

        <div className="bg-white border border-[#dbdbdb] rounded-xl px-5 py-6 mt-6 text-center">
          <div className="flex items-center justify-center gap-2 text-[#7b7b7b] text-sm mb-2">
            <Award className="w-4 h-4 text-[#ac8121]" />
            {exam?.title || "Scholarship Exam"}
          </div>
          <div className="text-5xl font-bold leading-none text-[#002856]">{pctDisplay}%</div>
          <p className="text-[#7b7b7b] text-sm mt-1">scholarship awarded</p>
        </div>

        <a
          href="tel:+919972266767"
          onClick={handleContactClick}
          className="mt-6 w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#002856] text-white rounded-xl font-bold hover:bg-[#001e40] transition"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
          </svg>
          Contact SkillCase Team
        </a>

        <button
          onClick={() => navigate("/scholarship")}
          className="w-full mt-3 px-6 py-3 text-[#002856] rounded-xl font-semibold hover:bg-gray-50 transition"
        >
          Back to Scholarship
        </button>
      </div>
    </div>
  );
}
