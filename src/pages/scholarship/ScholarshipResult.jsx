import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  getExamResult,
  createSeatCheckout,
} from "../../api/scholarshipExamApi";
import { useFirstPartyAnalytics } from "../../telemetry/legacyAnalytics";
import ScholarshipLevelPickerModal from "../../components/ScholarshipLevelPickerModal";
import ScholarshipStatusCard from "../../components/ScholarshipStatusCard";
import { switchScholarshipToMode } from "../../utils/lgMode";
import toast from "react-hot-toast";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Clock,
  Award,
  Dumbbell,
  Sparkles,
  Phone,
  Hourglass,
  Heart,
  X,
  BookOpen,
  Ticket,
  CheckCircle2,
} from "lucide-react";
import { getMayaImage } from "../../utils/mayaAvatars";
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
  const [userAward, setUserAward] = useState({
    active: false,
    pct: null,
    reason: null,
  });
  const user = useSelector((state) => state.auth.user);
  const expiresAt = exam?.redemption_expires_at;
  // Per-user override always wins over tier pct
  const awarded = userAward.active
    ? userAward.pct
    : submission?.awarded_scholarship_pct;
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
    try {
      const freshUser = await switchScholarshipToMode(mode);
      goToMode(mode, freshUser);
    } catch (err) {
      toast.error("Failed to switch modes. Please try again.");
    }
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
        setUserAward({
          active: !!res.data?.user_award_active,
          pct: res.data?.user_award_pct ?? null,
          reason: res.data?.user_award_reason || null,
        });
        // Report the pct the candidate actually saw. Reading the tier snapshot
        // here would log 0%/ineligible for anyone on a manual award.
        const effectivePct = res.data?.user_award_active
          ? res.data?.user_award_pct
          : res.data?.submission?.awarded_scholarship_pct;
        analytics?.capture("scholarship_result_viewed", {
          feature_key: "scholarship_exam",
          exam_id: testId,
          exam_title: res.data?.exam?.title,
          results_visible: true,
          awarded_pct: effectivePct ?? null,
          is_eligible: effectivePct != null && Number(effectivePct) > 0,
          award_source: res.data?.user_award_active ? "user_award" : "tier",
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

  // ── Seat-booking (Razorpay ₹3,000) ──────────────────────────────────────
  // Eligible + not expired candidates can mint a payment link. State machine:
  //   idle → (click) → loading → success → window.location.href redirect
  //                                 ↘ error → toast-style fallback message
  // Once a successful payment is recorded by the webhook, the next fetchResult
  // can hydrate `seatBooked` from payment_transaction if the API exposes it —
  // until then the button simply stays available for retry.
  const [seatLoading, setSeatLoading] = useState(false);
  const [seatError, setSeatError] = useState(null);
  const [seatBooked, setSeatBooked] = useState(false);

  useEffect(() => {
    // Hydrate "already booked" state from a previous visit so we don't
    // re-mint a link on every page reload.
    setSeatBooked(
      Boolean(submission?.seat_booked) ||
        Boolean(exam?.seat_booked_for_candidate),
    );
  }, [submission, exam]);

  const handleBookSeat = async () => {
    if (seatLoading || seatBooked) return;
    setSeatLoading(true);
    setSeatError(null);
    try {
      const res = await createSeatCheckout(testId);
      const url = res.data?.checkoutUrl;
      if (!url) throw new Error("No checkout URL returned");
      analytics?.capture("scholarship_seat_checkout_clicked", {
        feature_key: "scholarship_exam",
        exam_id: testId,
        amount_paise: res.data?.amountPaise,
        attempt_id: res.data?.attemptId,
      });
      // Redirect to Razorpay's hosted checkout.
      window.location.href = url;
    } catch (err) {
      const code = err.response?.data?.code;
      const msg =
        err.response?.data?.msg ||
        (err.code === "ERR_NETWORK"
          ? "Network error. Please try again."
          : "Booking failed. Please try again or contact the team.");
      // Already-booked: flip the local flag and let the UI render the
      // "Seat booked" badge.
      if (code === "seat_already_booked") {
        setSeatBooked(true);
        setSeatError(null);
      } else {
        setSeatError(msg);
      }
      analytics?.capture("scholarship_seat_checkout_failed", {
        feature_key: "scholarship_exam",
        exam_id: testId,
        reason_code: code || "unknown",
        message: msg,
      });
    } finally {
      setSeatLoading(false);
    }
  };

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
            <div className="absolute -left-12 -bottom-16 w-52 h-52 bg-[#1E76F3]/60 opacity-20 rounded-full blur-3xl" />
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

  // Expired but was eligible → rendered cleanly via ScholarshipStatusCard
  if (isEligible && isExpired) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="w-full max-w-md mx-auto px-4 pt-3 pb-6 flex-1 flex flex-col">
          <ScholarshipStatusCard
            topTitle="Scholarship Exam"
            badge={{
              icon: Clock,
              label: "OFFER EXPIRED",
              color: "red",
            }}
            character={mayaSad}
            floatingIcon={Hourglass}
            title="Offer expired"
            description={
              <>
                Your scholarship window closed on{" "}
                <span className="font-bold text-slate-800">
                  {expiresDisplay || "recently"}
                </span>
                . Contact our team to explore next steps.
              </>
            }
            primaryCta={{
              label: "Contact SkillCase Team",
              icon: Phone,
              href: "tel:+919972266767",
              onClick: () =>
                analytics?.capture("scholarship_contact_cta_clicked", {
                  feature_key: "scholarship_exam",
                  exam_id: testId,
                  awarded_pct: Number(awarded),
                  percentile,
                  expired: true,
                }),
            }}
            secondaryCta={{
              label: "Continue Practicing German",
              icon: Dumbbell,
              onClick: () => handleModeHandoff("practice"),
            }}
            onBack={() => navigate("/scholarship")}
            backLabel="Back to Scholarship"
          />
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
        <div className="w-full max-w-md mx-auto px-4 pt-3 pb-6 flex-1 flex flex-col">
          <ScholarshipStatusCard
            topTitle="Scholarship Exam"
            character={mayaSad}
            floatingBadgeType="rejection"
            title={
              <>
                You <span className="text-[#1E76F3]">didn't make it</span> this
                time
              </>
            }
            description={
              <div className="text-center text-slate-600 text-xs sm:text-sm leading-relaxed">
                {/* Heart Divider */}
                <div className="flex items-center justify-center gap-3 my-2 w-full max-w-[200px] mx-auto">
                  <div className="flex-1 border-t border-blue-200/80" />
                  <Heart className="w-3.5 h-3.5 text-[#1E76F3]/60 fill-[#1E76F3]/60/15" />
                  <div className="flex-1 border-t border-blue-200/80" />
                </div>
                <p>Every attempt helps you grow.</p>
                <p className="mt-0.5 flex items-center justify-center gap-1">
                  <span>Keep going, we're with you.</span>
                  <Heart className="w-3 h-3 text-[#1E76F3]/60 fill-[#1E76F3]/60 inline" />
                </p>
              </div>
            }
            primaryCta={{
              label: "Talk to Our Team",
              icon: Phone,
              href: "tel:+919972266767",
              onClick: () =>
                analytics?.capture("scholarship_contact_cta_clicked", {
                  feature_key: "scholarship_exam",
                  exam_id: testId,
                  awarded_pct: Number(awarded),
                  percentile,
                  rejected: true,
                }),
            }}
            secondaryCta={{
              label: "Keep Practicing",
              icon: Dumbbell,
              onClick: () => handleModeHandoff("practice"),
            }}
            onBack={() => navigate("/scholarship")}
            backLabel="Back to Scholarship Exam"
          />
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
      <div className="w-full max-w-md mx-auto px-4 pt-3 pb-6 flex-1 flex flex-col">
        {/* Sub-Header bar */}
        <div className="w-full flex items-center justify-between mb-3 px-1">
          <button
            onClick={() => navigate("/scholarship")}
            className="flex items-center gap-1 text-base font-bold text-[#002856] hover:opacity-80 transition cursor-pointer bg-transparent border-none p-0"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
            <span>Back</span>
          </button>
          <span className="text-sm font-semibold text-[#64748b]">
            Scholarship Exam
          </span>
        </div>

        {/* Main Card Container with soft sky-blue gradient */}
        <div className="w-full flex-1 px-5 py-7 bg-gradient-to-b from-[#eaf2fd] via-[#f0f6ff] to-[#f8fbff] rounded-md border border-blue-100/60 flex flex-col justify-between items-center text-center">
          {/* Top/Center content group */}
          <div className="w-full flex flex-col items-center justify-center my-auto">
            {/* Character Hero with Confetti, Laurels, Disc & Ribbon */}
            <div className="relative mb-3 flex items-center justify-center w-full max-w-[340px] min-h-[220px]">
              {/* Outer Confetti Scattered in Free Sky */}
              <div className="absolute inset-0 pointer-events-none z-0">
                {/* Left Top Sky Confetti */}
                <div className="absolute top-2 left-2 w-2.5 h-4.5 bg-[#2563eb] rounded-xs -rotate-45" />
                <div className="absolute top-6 left-12 w-2 h-3.5 bg-[#ef4444] rounded-xs rotate-25" />
                <div className="absolute top-18 left-3 w-2.5 h-2.5 bg-[#10b981] rounded-xs rotate-12" />
                <div className="absolute top-28 left-0 w-3 h-4 bg-[#f59e0b] rounded-xs rotate-45" />
                <div className="absolute top-40 left-6 w-2 h-2.5 bg-[#2563eb] rounded-xs rotate-45" />
                <div className="absolute top-48 left-1 w-2.5 h-3.5 bg-[#ef4444] rounded-xs -rotate-30" />

                {/* Left Sparkles */}
                <div className="absolute top-1 left-8 text-[#93c5fd] text-xs select-none">
                  ✦
                </div>
                <div className="absolute top-14 left-0 text-[#93c5fd] text-[9px] select-none">
                  ✦
                </div>
                <div className="absolute top-32 left-10 text-[#93c5fd] text-[10px] select-none">
                  ✦
                </div>

                {/* Right Top Sky Confetti */}
                <div className="absolute top-2 right-10 w-2.5 h-4 bg-[#f59e0b] rounded-xs -rotate-30" />
                <div className="absolute top-6 right-2 w-2.5 h-3.5 bg-[#10b981] rounded-xs rotate-45" />
                <div className="absolute top-18 right-10 w-2 h-3 bg-[#ef4444] rounded-xs -rotate-25" />
                <div className="absolute top-28 right-0 w-2.5 h-4 bg-[#2563eb] rounded-xs -rotate-40" />
                <div className="absolute top-40 right-4 w-2.5 h-3 bg-[#f59e0b] rounded-xs rotate-30" />

                {/* Right Sparkles */}
                <div className="absolute top-1 right-4 text-[#93c5fd] text-xs select-none">
                  ✦
                </div>
                <div className="absolute top-14 right-12 text-[#93c5fd] text-[9px] select-none">
                  ✦
                </div>
                <div className="absolute top-32 right-8 text-[#93c5fd] text-[10px] select-none">
                  ✦
                </div>
              </div>

              {/* Central Hero Composition */}
              <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-end justify-center">
                {/* 1. Background Circular Disc */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-b from-[#d8e9fe] to-[#edf5fe] shadow-[inset_0_2px_6px_rgba(255,255,255,0.9),_0_6px_20px_rgba(186,215,254,0.35)]" />

                {/* 2. Left Laurel Wreath (Starting from behind Maya and wrapping around the OUTSIDE of the disc) */}
                <div className="absolute bottom-4 -left-7 sm:-left-9 z-10 opacity-90 pointer-events-none">
                  <svg width="70" height="150" viewBox="0 0 70 150" fill="none">
                    <path
                      d="M 62 140 C 18 105 16 45 52 8"
                      stroke="#93c5fd"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    {/* Pair 1 */}
                    <path
                      d="M 46 122 C 34 125 28 116 32 110 C 37 104 48 110 47 117 Z"
                      fill="#93c5fd"
                    />
                    <path
                      d="M 56 126 C 63 129 70 123 68 117 C 65 111 57 114 55 121 Z"
                      fill="#93c5fd"
                    />
                    {/* Pair 2 */}
                    <path
                      d="M 32 98 C 20 98 16 88 22 82 C 28 76 37 85 35 92 Z"
                      fill="#93c5fd"
                    />
                    <path
                      d="M 43 100 C 51 102 58 96 55 90 C 53 84 45 88 42 95 Z"
                      fill="#93c5fd"
                    />
                    {/* Pair 3 */}
                    <path
                      d="M 24 72 C 12 69 11 59 18 54 C 25 49 32 59 29 67 Z"
                      fill="#93c5fd"
                    />
                    <path
                      d="M 36 72 C 44 73 52 66 48 60 C 45 54 38 58 35 66 Z"
                      fill="#93c5fd"
                    />
                    {/* Pair 4 */}
                    <path
                      d="M 26 44 C 17 38 20 27 27 24 C 34 22 38 32 34 40 Z"
                      fill="#93c5fd"
                    />
                    <path
                      d="M 38 42 C 46 41 51 33 47 27 C 43 21 38 28 36 37 Z"
                      fill="#93c5fd"
                    />
                    {/* Top Leaf */}
                    <path
                      d="M 52 8 C 47 1 52 -5 57 -5 C 62 -4 63 4 58 8 Z"
                      fill="#93c5fd"
                    />
                  </svg>
                </div>

                {/* 3. Right Laurel Wreath (Starting from behind Maya and wrapping around the OUTSIDE of the disc) */}
                <div className="absolute bottom-4 -right-7 sm:-right-9 z-10 opacity-90 pointer-events-none transform -scale-x-100">
                  <svg width="70" height="150" viewBox="0 0 70 150" fill="none">
                    <path
                      d="M 62 140 C 18 105 16 45 52 8"
                      stroke="#93c5fd"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    {/* Pair 1 */}
                    <path
                      d="M 46 122 C 34 125 28 116 32 110 C 37 104 48 110 47 117 Z"
                      fill="#93c5fd"
                    />
                    <path
                      d="M 56 126 C 63 129 70 123 68 117 C 65 111 57 114 55 121 Z"
                      fill="#93c5fd"
                    />
                    {/* Pair 2 */}
                    <path
                      d="M 32 98 C 20 98 16 88 22 82 C 28 76 37 85 35 92 Z"
                      fill="#93c5fd"
                    />
                    <path
                      d="M 43 100 C 51 102 58 96 55 90 C 53 84 45 88 42 95 Z"
                      fill="#93c5fd"
                    />
                    {/* Pair 3 */}
                    <path
                      d="M 24 72 C 12 69 11 59 18 54 C 25 49 32 59 29 67 Z"
                      fill="#93c5fd"
                    />
                    <path
                      d="M 36 72 C 44 73 52 66 48 60 C 45 54 38 58 35 66 Z"
                      fill="#93c5fd"
                    />
                    {/* Pair 4 */}
                    <path
                      d="M 26 44 C 17 38 20 27 27 24 C 34 22 38 32 34 40 Z"
                      fill="#93c5fd"
                    />
                    <path
                      d="M 38 42 C 46 41 51 33 47 27 C 43 21 38 28 36 37 Z"
                      fill="#93c5fd"
                    />
                    {/* Top Leaf */}
                    <path
                      d="M 52 8 C 47 1 52 -5 57 -5 C 62 -4 63 4 58 8 Z"
                      fill="#93c5fd"
                    />
                  </svg>
                </div>

                {/* 4. Maya Character Asset */}
                <img
                  src={getMayaImage("thumbsup", user?.occupation)}
                  alt="Maya cheering"
                  className="relative z-20 w-40 sm:w-44 object-contain drop-shadow-[0_8px_14px_rgba(0,40,86,0.12)]"
                />
              </div>

              {/* 5. 3D Silky Blue Arched Ribbon Banner */}
              <div className="absolute -bottom-5 z-30 w-full max-w-[270px] flex items-center justify-center filter drop-shadow-[0_8px_16px_rgba(29,78,216,0.38)] pointer-events-none">
                <svg
                  width="270"
                  height="52"
                  viewBox="0 0 270 52"
                  fill="none"
                  className="w-full"
                >
                  <defs>
                    <linearGradient
                      id="ribbonBodyGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="40"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="50%" stopColor="#1d4ed8" />
                      <stop offset="100%" stopColor="#1e40af" />
                    </linearGradient>
                    <linearGradient
                      id="ribbonFoldDark"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="20"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0%" stopColor="#172554" />
                      <stop offset="100%" stopColor="#1e3a8a" />
                    </linearGradient>
                    <linearGradient
                      id="ribbonTailColor"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="35"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0%" stopColor="#2563eb" />
                      <stop offset="100%" stopColor="#1d4ed8" />
                    </linearGradient>
                    <path
                      id="ribbonTextArc"
                      d="M 28 25 Q 135 39 242 25"
                      fill="none"
                    />
                  </defs>

                  {/* Left Swallow Tail */}
                  <path
                    d="M 4 12 L 32 18 L 32 44 L 4 36 L 15 24 Z"
                    fill="url(#ribbonTailColor)"
                  />

                  {/* Right Swallow Tail */}
                  <path
                    d="M 266 12 L 238 18 L 238 44 L 266 36 L 255 24 Z"
                    fill="url(#ribbonTailColor)"
                  />

                  {/* Left Under-Fold Triangle */}
                  <path
                    d="M 30 32 L 30 44 L 46 36 Z"
                    fill="url(#ribbonFoldDark)"
                  />

                  {/* Right Under-Fold Triangle */}
                  <path
                    d="M 240 32 L 240 44 L 224 36 Z"
                    fill="url(#ribbonFoldDark)"
                  />

                  {/* Main Center Ribbon with gentle downward arch */}
                  <path
                    d="M 28 6 Q 135 20 242 6 L 242 32 Q 135 46 28 32 Z"
                    fill="url(#ribbonBodyGrad)"
                  />
                  {/* Top Specular Sheen line */}
                  <path
                    d="M 30 7 Q 135 21 240 7"
                    stroke="#93c5fd"
                    strokeWidth="1.2"
                    strokeOpacity="0.8"
                    fill="none"
                  />

                  {/* Curved Ribbon Text */}
                  <text
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="900"
                    letterSpacing="1.4"
                    className="select-none"
                    style={{ textShadow: "0 1px 2px rgba(0,0,0,0.35)" }}
                  >
                    <textPath
                      href="#ribbonTextArc"
                      startOffset="50%"
                      textAnchor="middle"
                    >
                      ★ CONGRATULATIONS! ★
                    </textPath>
                  </text>
                </svg>
              </div>
            </div>

            {/* Title Block */}
            <div className="mt-5">
              <h1 className="text-[24px] sm:text-[28px] font-extrabold text-[#002856] text-center tracking-tight leading-tight">
                You&apos;re eligible for{" "}
                <span className="text-[#1E76F3] block mt-0.5">
                  {pctDisplay}% scholarship
                </span>
              </h1>

              {percentile != null && (
                <p className="text-xs sm:text-sm font-bold text-[#15803d] mt-1.5">
                  You&apos;re above {percentile}% of candidates
                </p>
              )}

              <p className="text-xs sm:text-sm text-slate-600 mt-2 px-3 text-center leading-relaxed max-w-xs mx-auto">
                Contact our admissions team to claim your scholarship and begin
                your course.
              </p>
            </div>

            {/* Gift Box & Countdown Award Card */}
            <div className="w-full bg-white rounded-md p-4 sm:p-5 shadow-sm border border-slate-100/90 text-left mt-4">
              <div className="flex items-center gap-4">
                {/* Gift Icon inside Light Blue Disc */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#e0f2fe] flex items-center justify-center shrink-0">
                  <div className="relative flex items-center justify-center">
                    <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
                      <rect
                        x="5"
                        y="13"
                        width="24"
                        height="17"
                        rx="3"
                        fill="#1E76F3"
                      />
                      <rect
                        x="3"
                        y="9"
                        width="28"
                        height="6"
                        rx="2"
                        fill="#2563EB"
                      />
                      <rect x="14" y="9" width="6" height="21" fill="#EDB843" />
                      <path
                        d="M17 9C14 5 9 5 11 9C13 9 15 9 17 9Z"
                        fill="#EDB843"
                      />
                      <path
                        d="M17 9C20 5 25 5 23 9C21 9 19 9 17 9Z"
                        fill="#EDB843"
                      />
                    </svg>
                    <span className="absolute -top-1 -right-1 text-amber-400 text-xs">
                      ✦
                    </span>
                    <span className="absolute -bottom-1 -left-1 text-amber-400 text-[10px]">
                      ✦
                    </span>
                  </div>
                </div>

                {/* Vertical separator */}
                <div className="w-[1px] h-12 bg-slate-200/80 shrink-0" />

                {/* Percent & Label */}
                <div className="flex-1 min-w-0">
                  <div className="text-3xl sm:text-4xl font-black text-[#002856] leading-none">
                    {pctDisplay}%
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    scholarship awarded
                  </p>
                </div>
              </div>

              {/* Live Redemption Countdown */}
              {expiresAt && !isExpired && timeLeft && (
                <div className="mt-3 pt-3 border-t border-dashed border-slate-200/80 flex items-center justify-center gap-1.5 text-xs sm:text-sm text-[#1E76F3]/60 font-bold">
                  <Clock className="w-4 h-4 text-[#1E76F3]/60 stroke-[2.2]" />
                  <span>
                    Redeem within{" "}
                    {timeLeft.days > 0 ? `${timeLeft.days}d ` : ""}
                    {String(timeLeft.hours).padStart(2, "0")}:
                    {String(timeLeft.mins).padStart(2, "0")}:
                    {String(timeLeft.secs).padStart(2, "0")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons Stack */}
          <div className="w-full space-y-3 mt-4 max-w-sm mx-auto">
            {/* "Book my seat" — primary CTA for eligible candidates.
                Hidden once a successful booking is recorded for this exam. */}
            {!seatBooked && (
              <button
                type="button"
                onClick={handleBookSeat}
                disabled={seatLoading}
                data-testid="book-my-seat-button"
                className="w-full py-3.5 px-5 bg-[#edb843] hover:bg-[#d6a82f] text-[#002856] rounded-md font-extrabold text-sm sm:text-base transition flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.99] shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {seatLoading ? (
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                ) : (
                  <Ticket className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
                <span>
                  {seatLoading ? "Opening checkout…" : "Book my seat"}
                </span>
              </button>
            )}
            {seatBooked && (
              <div
                data-testid="seat-booked-badge"
                className="w-full py-3 px-4 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-700 text-sm font-bold flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Seat booked — we will reach out shortly
              </div>
            )}
            {seatError && !seatBooked && (
              <p
                data-testid="seat-booking-error"
                className="text-xs text-red-600 font-semibold text-center"
              >
                {seatError}
              </p>
            )}

            {/* Contact Team CTA */}
            <a
              href="tel:+919972266767"
              onClick={handleContactClick}
              className="w-full py-3.5 px-5 bg-[#002856] hover:bg-[#001e40] text-white rounded-md font-bold text-sm sm:text-base transition flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.99]"
            >
              <Phone className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              <span>Contact Skillcase Team</span>
            </a>

            {/* Practice CTA */}
            <button
              type="button"
              onClick={() => handleModeHandoff("practice")}
              className="w-full py-3.5 px-3 border border-[#1E76F3]/60 text-[#002856] rounded-md font-bold text-sm sm:text-base transition flex items-center justify-between cursor-pointer active:scale-[0.99]"
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-[#1E76F3]/60" />
                <span className="text-sm font-bold text-[#002856]">
                  Practice while you wait
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-[#1E76F3]/60" />
            </button>

            {/* Back to Scholarship Link */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => navigate("/scholarship")}
                className="text-xs sm:text-sm font-semibold text-slate-500 hover:text-[#002856] hover:underline cursor-pointer bg-transparent border-none"
              >
                Back to Scholarship
              </button>
            </div>
          </div>
        </div>
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
