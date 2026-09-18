import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import SelectOpportunityStep from "./components/SelectOpportunityStep";
import { getProgress } from "../../api/jobScreeningApi";

// /job-screening/opportunity/:id — deep link target shared by admins (web
// link via /redirect?route=… and the skillcase://app scheme) and by the
// status-change push notification. The pathway page only exists while the
// candidate's select_opportunity step is live; anything else falls back to
// the screening pipeline root.
const OpportunityDeepLink = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    getProgress()
      .then((res) => {
        if (alive) setProgress(res.data?.data || res.data);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (failed) return <Navigate to="/job-screening" replace />;
  if (!progress) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#002856]/50" />
      </div>
    );
  }

  const step = (progress?.steps_config || []).find(
    (s) => s.id === "select_opportunity",
  );
  // Live = pending or review, matching the pipeline's isStepLive convention.
  const stepLive =
    step?.status === "pending" || step?.status === "review";
  if (!stepLive) {
    return <Navigate to="/job-screening" replace />;
  }

  // Same full-bleed mount JobScreening uses for this step — max-w-md centered,
  // the step supplies its own padding.
  return (
    <div className="min-h-screen bg-white w-full flex flex-col items-center overflow-y-auto">
      <div className="w-full max-w-md flex-1 flex flex-col min-h-screen">
        <SelectOpportunityStep
          initialOpportunityId={id}
          onBack={() => navigate("/job-screening")}
        />
      </div>
    </div>
  );
};

export default OpportunityDeepLink;
