import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import CourseOptedIn from "./CourseOptedIn";
import OpportunityDetailView from "../../../components/opportunity/OpportunityDetailView";
import {
  oppAlpha,
  oppShade,
} from "../../../components/opportunity/opportunityTheme";
import {
  getOpportunities,
  selectOpportunity,
} from "../../../api/jobScreeningApi";
import mayaThumbsup from "../../../assets/onboarding/mayaThumbsup.webp";
// select_opportunity step — candidate browses up to 3 admin-authored
// opportunities, opens one to read its dynamic content, and picks it.
// Selection never completes the step: the candidate stays here until admin
// skips the step (or resets the selection) from the candidate panel.

const SELECTED_STEPS = [
  { state: "done", title: "Path selected" },
  { state: "active", title: "Our team reaches out within 24 hours" },
  { state: "pending", title: "Your onboarding begins" },
];

const SubHeader = ({ title, onBack }) => (
  <div className="w-full px-4 sm:px-6 py-3 flex items-center gap-3 border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-20">
    <button
      type="button"
      onClick={onBack}
      className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 text-[#002856] rounded-xl active:scale-95 transition-all cursor-pointer shadow-2xs"
    >
      <ArrowLeft className="w-4.5 h-4.5" />
    </button>
    <h2 className="text-base font-bold text-[#002856] tracking-tight">
      {title}
    </h2>
  </div>
);

const SelectOpportunityStep = ({ progress, onComplete, onBack }) => {
  const selected = progress?.selected_opportunity || null;
  const [opportunities, setOpportunities] = useState(null); // null = loading
  const [view, setView] = useState("list"); // list | detail
  const [activeOpp, setActiveOpp] = useState(null);
  const [selecting, setSelecting] = useState(false);
  const [selectError, setSelectError] = useState("");
  const [justSelected, setJustSelected] = useState(null);

  // Thank-you state: persisted (progress.selected_opportunity) or just picked.
  const selectedOpp = justSelected || selected;

  useEffect(() => {
    if (selectedOpp) return; // already chosen — no need to fetch the list
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
  }, [selectedOpp]);

  if (selectedOpp) {
    return (
      <CourseOptedIn
        heading="Thank you for your interest"
        subtext={`You have selected to go with “${selectedOpp.title}”. Our team will reach out to you within the next 24 hours.`}
        steps={SELECTED_STEPS}
        ctaLabel="Okay got it"
        onBack={onBack}
        onDone={onBack}
      />
    );
  }

  const handleChoose = async () => {
    if (!activeOpp || selecting) return;
    setSelecting(true);
    setSelectError("");
    try {
      const res = await selectOpportunity(activeOpp.id);
      setJustSelected(res.data?.data?.selected || activeOpp);
    } catch (err) {
      setSelectError(
        err?.response?.data?.message ||
          "Could not select this path. Please try again.",
      );
    } finally {
      setSelecting(false);
    }
  };

  const loading = opportunities === null;

  // ---- Detail view ----------------------------------------------------------
  if (view === "detail" && activeOpp) {
    return (
      <div className="w-full min-h-[calc(100vh-4rem)] bg-white flex flex-col">
        <SubHeader title="Pathways" onBack={() => setView("list")} />
        <OpportunityDetailView
          opportunity={activeOpp}
          choosing={selecting}
          error={selectError}
          onChoose={handleChoose}
          onBack={() => setView("list")}
        />
      </div>
    );
  }

  // ---- Listing view ----------------------------------------------------------
  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-white flex flex-col">
      <SubHeader title="Pathways" onBack={onBack} />
      <div className="flex-1 px-4 sm:px-6 pt-6 pb-10 bg-gradient-to-l from-white to-[#eff6ff] flex flex-col gap-6">
        <div className="flex items-end gap-1">
          <div className="flex-1 flex flex-col gap-2 text-left">
            <h1 className="text-[#002856] text-xl font-bold tracking-tight leading-snug">
              You are eligible for these paths
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
          <div className="flex items-center justify-center py-12 text-[#002856]/50">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : opportunities.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 text-center">
            <p className="text-xs font-semibold text-slate-500">
              No paths are open right now — check back soon.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {opportunities.map((opp, i) => (
              <motion.button
                key={opp.id}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => {
                  setActiveOpp(opp);
                  setView("detail");
                }}
                className="w-full p-3 bg-white rounded-2xl border text-left flex flex-col gap-3 cursor-pointer active:scale-[0.99] transition-transform"
                style={{ borderColor: oppAlpha(opp.color, 0.5) }}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-20 h-16 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                    {opp.image_download_url ? (
                      <img
                        src={opp.image_download_url}
                        alt={opp.title}
                        className="w-full h-full object-contain select-none"
                        draggable="false"
                      />
                    ) : (
                      <div
                        className="w-full h-full"
                        style={{ backgroundColor: oppAlpha(opp.color, 0.12) }}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex items-start gap-2">
                      <h3 className="flex-1 text-slate-900 text-sm font-bold leading-snug">
                        {opp.title}
                      </h3>
                      <ArrowUpRight
                        className="w-4.5 h-4.5 shrink-0 mt-0.5"
                        style={{ color: oppShade(opp.color, 0.5) }}
                      />
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
                    {opp.points.map((point, j) => (
                      <span
                        key={j}
                        className="px-2 py-0.5 rounded-full text-[8.5px] font-semibold leading-tight whitespace-nowrap"
                        style={{
                          backgroundColor: oppAlpha(opp.color, 0.1),
                          color: oppShade(opp.color, 0.4),
                        }}
                      >
                        {point}
                      </span>
                    ))}
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectOpportunityStep;
