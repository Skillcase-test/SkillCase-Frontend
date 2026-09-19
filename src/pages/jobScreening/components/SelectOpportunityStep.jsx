import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";
import CourseOptedIn from "./CourseOptedIn";
import OpportunityStatusModal from "./OpportunityStatusModal";
import OpportunityListSkeleton from "./OpportunityListSkeleton";
import OpportunityIcon from "../../../components/opportunity/OpportunityIcon";
import OpportunityImage from "../../../components/opportunity/OpportunityImage";
import OpportunityDetailView from "../../../components/opportunity/OpportunityDetailView";
import {
  oppAlpha,
  oppShade,
} from "../../../components/opportunity/opportunityTheme";
import {
  getOpportunities,
  selectOpportunity,
  markStepNoteViewed,
} from "../../../api/jobScreeningApi";
import mayaThumbsup from "../../../assets/onboarding/mayaThumbsup.webp";
// select_opportunity step — candidate browses the admin-authored
// opportunities, opens one to read its dynamic content, and applies for it.
// Multiple opportunities may be applied for; each pick is independent.
// Admins mark applied ones shortlisted (green, floats to top) or rejected
// (rose, sinks to bottom). Applying never completes the step: the candidate
// stays here until admin skips it.

const SELECTED_STEPS = [
  { state: "done", title: "Application sent" },
  { state: "active", title: "Our team reaches out within 24 hours" },
  { state: "pending", title: "Your onboarding begins" },
];

const SHORTLISTED_STEPS = [
  { state: "done", title: "You're shortlisted" },
  { state: "active", title: "Our team guides you very soon" },
  { state: "pending", title: "Your onboarding begins" },
];

const SubHeader = ({ title, onBack }) => (
  <div
    className="w-full px-4 sm:px-6 pb-3 bg-white flex items-center justify-start gap-3 border-b border-slate-200/80 sticky top-0 z-20 shrink-0"
    style={{ paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))" }}
  >
    <button
      type="button"
      onClick={onBack}
      className="w-7 h-7 flex items-center justify-center rounded-md border-2 border-slate-400 text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
      aria-label="Back"
    >
      <ArrowLeft className="w-4 h-4" />
    </button>
    <h2 className="text-base font-semibold text-[#002856] tracking-tight truncate">
      {title}
    </h2>
  </div>
);

// Subtle status washes — never full red/green, just a hue over white.
const CARD_STYLE = {
  shortlisted:
    "bg-gradient-to-br from-emerald-50 to-white border-emerald-300",
  rejected: "bg-gradient-to-br from-rose-50 to-white border-rose-300",
};

const STATUS_CHIP = {
  shortlisted: {
    label: "Shortlisted",
    cls: "bg-emerald-100 text-emerald-700",
  },
  rejected: { label: "Rejected", cls: "bg-rose-100 text-rose-600" },
  chosen: { label: "Applied", cls: "bg-indigo-100 text-indigo-700" },
};

// Statuses that trigger the one-shot Maya popup when a detail page opens.
const DECIDED = new Set(["shortlisted", "rejected"]);

// `onComplete` from the shared step contract is intentionally unused: this
// step never self-completes (admin skips it from the candidate panel).
// `progress` supplies step_notes — admin opportunity notes are stored there
// under "opportunity:<id>" keys, reusing the step-note pipeline.
const SelectOpportunityStep = ({ progress, onBack, initialOpportunityId }) => {
  const [opportunities, setOpportunities] = useState(null); // null = loading
  const [view, setView] = useState("list"); // list | detail | thanks | congrats
  const [activeOpp, setActiveOpp] = useState(null);
  const [selecting, setSelecting] = useState(false);
  const [selectError, setSelectError] = useState("");
  const [thanksOpp, setThanksOpp] = useState(null);
  const [ctaScroll, setCtaScroll] = useState(false);
  const [statusModal, setStatusModal] = useState(null); // 'shortlisted' | 'rejected'
  const deepLinkDone = useRef(false);

  useEffect(() => {
    let alive = true;
    getOpportunities()
      .then((res) => {
        if (alive) setOpportunities(res.data?.data || []);
      })
      .catch(() => {
        if (alive) setOpportunities([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Deep link: land straight on an opportunity's detail page, scrolled to the CTA.
  // deepLinkDone makes it a one-shot — otherwise returning to the list (or the
  // opportunities refresh after a pick) would reopen the detail forever.
  useEffect(() => {
    if (deepLinkDone.current || !initialOpportunityId || !opportunities?.length)
      return;
    const found = opportunities.find(
      (o) => o.id === Number(initialOpportunityId),
    );
    if (!found) return;
    deepLinkDone.current = true;
    setCtaScroll(true);
    setStatusModal(DECIDED.has(found.my_status) ? found.my_status : null);
    setActiveOpp(found);
    setView("detail");
  }, [initialOpportunityId, opportunities]);

  const openDetail = (opp) => {
    setCtaScroll(false);
    setSelectError("");
    setStatusModal(DECIDED.has(opp.my_status) ? opp.my_status : null);
    setActiveOpp(opp);
    setView("detail");
  };

  const backToList = () => {
    setSelectError("");
    setStatusModal(null);
    setView("list");
  };

  const markChosen = (oppId) =>
    setOpportunities((prev) =>
      (prev || []).map((o) =>
        o.id === oppId ? { ...o, my_status: "chosen" } : o,
      ),
    );

  const handleChoose = async () => {
    if (!activeOpp || selecting) return;
    setSelecting(true);
    setSelectError("");
    try {
      await selectOpportunity(activeOpp.id);
      markChosen(activeOpp.id);
      setActiveOpp((prev) =>
        prev ? { ...prev, my_status: "chosen" } : prev,
      );
      setThanksOpp(activeOpp);
      setView("thanks");
    } catch (err) {
      setSelectError(
        err?.response?.data?.message ||
          "Could not apply for this opportunity. Please try again.",
      );
    } finally {
      setSelecting(false);
    }
  };

  const loading = opportunities === null;

  // ---- Thank-you (just picked) --------------------------------------------
  if (view === "thanks" && thanksOpp) {
    return (
      <div
        className="w-full min-h-screen flex-1 bg-white flex flex-col px-4 pb-12"
        style={{
          paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))",
          paddingBottom: "calc(3rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <CourseOptedIn
          heading="Thank you for your interest"
          subtext={`You have applied for “${thanksOpp.title}”. Our team will reach out to you within the next 24 hours.`}
          steps={SELECTED_STEPS}
          ctaLabel="View all opportunities"
          onBack={onBack}
          onDone={() => {
            setThanksOpp(null);
            setView("list");
          }}
        />
      </div>
    );
  }

  // ---- Congratulations (shortlisted CTA tapped) ----------------------------
  if (view === "congrats" && activeOpp) {
    return (
      <div
        className="w-full min-h-screen flex-1 bg-white flex flex-col px-4 pb-12"
        style={{
          paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))",
          paddingBottom: "calc(3rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <CourseOptedIn
          heading="Congratulations!"
          subtext="You are shortlisted for this opportunity and our team will guide you very very soon."
          steps={SHORTLISTED_STEPS}
          ctaLabel="View all opportunities"
          onBack={onBack}
          onDone={() => setView("list")}
        />
      </div>
    );
  }

  // ---- Detail view ----------------------------------------------------------
  if (view === "detail" && activeOpp) {
    const oppNoteKey = `opportunity:${activeOpp.id}`;
    const oppNote = progress?.step_notes?.[oppNoteKey] || null;
    return (
      <div className="w-full min-h-screen flex-1 bg-white flex flex-col">
        <SubHeader title="Opportunities" onBack={backToList} />
        <OpportunityDetailView
          opportunity={activeOpp}
          status={activeOpp.my_status || null}
          choosing={selecting}
          error={selectError}
          onChoose={handleChoose}
          onShortlisted={() => setView("congrats")}
          onBack={backToList}
          scrollToCta={ctaScroll}
          note={oppNote}
          onNoteView={() => markStepNoteViewed(oppNoteKey)}
        />
        {statusModal && (
          <OpportunityStatusModal
            status={statusModal}
            title={activeOpp.title}
            onDismiss={() => setStatusModal(null)}
            onCheckOthers={() => {
              setStatusModal(null);
              backToList();
            }}
          />
        )}
      </div>
    );
  }

  // ---- Listing view ----------------------------------------------------------
  return (
    <div className="w-full min-h-screen flex-1 bg-white flex flex-col">
      <SubHeader title="Opportunities" onBack={onBack} />
      <div className="flex-1 px-4 sm:px-6 pt-6 pb-12 bg-gradient-to-b from-[#eff6ff] to-white flex flex-col gap-6">
        <div className="flex items-end gap-1">
          <div className="flex-1 flex flex-col gap-2 text-left">
            <h1 className="text-[#002856] text-xl font-bold tracking-tight leading-snug">
              You are eligible for these opportunities
            </h1>
            <p className="text-[#002856]/70 text-xs font-medium leading-relaxed">
              Choose how you want to move ahead and get placed
            </p>
          </div>
          <img
            src={mayaThumbsup}
            alt=""
            className="w-24 h-24 object-contain shrink-0 select-none"
            draggable="false"
          />
        </div>

        {loading ? (
          <OpportunityListSkeleton cardsOnly />
        ) : opportunities.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 text-center">
            <p className="text-xs font-semibold text-slate-500">
              No opportunities are open right now — check back soon.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {opportunities.map((opp, i) => {
              const chip = STATUS_CHIP[opp.my_status];
              return (
                <motion.button
                  key={opp.id}
                  type="button"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => openDetail(opp)}
                  className={`w-full p-3 rounded-2xl border text-left flex flex-col gap-3 cursor-pointer active:scale-[0.99] transition-transform ${CARD_STYLE[opp.my_status] || "bg-white"}`}
                  style={
                    CARD_STYLE[opp.my_status]
                      ? undefined
                      : { borderColor: oppAlpha(opp.color, 0.5) }
                  }
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-20 h-16 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                      <OpportunityImage
                        src={opp.image_download_url}
                        alt={opp.title}
                        className="w-full h-full"
                        placeholder={
                          <div
                            className="w-full h-full"
                            style={{
                              backgroundColor: oppAlpha(opp.color, 0.12),
                            }}
                          />
                        }
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div className="flex items-start gap-2">
                        <h3 className="flex-1 text-slate-900 text-sm font-bold leading-snug">
                          {opp.title}
                        </h3>
                        {chip ? (
                          <span
                            className={`shrink-0 px-1.5 py-0.5 rounded-md text-[8.5px] font-bold uppercase tracking-wide ${chip.cls}`}
                          >
                            {chip.label}
                          </span>
                        ) : (
                          <ChevronRight
                            className="w-4.5 h-4.5 shrink-0 mt-0.5"
                            style={{ color: oppShade(opp.color, 0.5) }}
                          />
                        )}
                      </div>
                      {opp.short_description && (
                        <p className="text-slate-600/80 text-[11px] font-medium leading-snug">
                          {opp.short_description}
                        </p>
                      )}
                    </div>
                  </div>
                  {opp.points?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {opp.points.map((point, j) => {
                        const pt =
                          typeof point === "string"
                            ? { icon: null, text: point }
                            : point || {};
                        return (
                          <span
                            key={j}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[8.5px] font-semibold leading-tight whitespace-nowrap"
                            style={{
                              backgroundColor: oppAlpha(opp.color, 0.1),
                              color: oppShade(opp.color, 0.4),
                            }}
                          >
                            {pt.icon && (
                              <OpportunityIcon
                                name={pt.icon}
                                className="w-3 h-3 shrink-0"
                              />
                            )}
                            {pt.text}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectOpportunityStep;
