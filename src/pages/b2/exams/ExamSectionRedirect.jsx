import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { ChevronLeft, Loader2, AlertCircle } from "lucide-react";
import {
  startB2ExamSubmission,
  getB2ExamSubmissionStatus,
} from "../../../api/b2Api";

// Fixed test sequence — sections are taken one by one, no picker screen.
const SECTION_ORDER = ["reading", "listening", "speaking", "writing"];

// Replaces the old "choose a section" dashboard: resolves the learner's
// active submission and forwards straight to the first incomplete section
// (or the result screen when everything is done). Kept on the /dashboard
// route so every existing entry point (get-ready, test hub, section
// results) resumes at the right place automatically.
export default function ExamSectionRedirect() {
  const navigate = useNavigate();
  const { paperId } = useParams();
  const { user } = useSelector((state) => state.auth);
  const [failed, setFailed] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (!user?.user_id || !paperId || ran.current) return;
    ran.current = true;

    const go = (path) => navigate(path, { replace: true });

    (async () => {
      try {
        const startRes = await startB2ExamSubmission(paperId);
        const statusRes = await getB2ExamSubmissionStatus(startRes.data.id);
        const sections = Array.isArray(statusRes.data.sections)
          ? statusRes.data.sections
          : [];
        const next = SECTION_ORDER.find(
          (type) =>
            sections.find((s) => s.section_type === type)?.status !==
            "completed",
        );
        go(
          next
            ? `/b2/exams/papers/${paperId}/${next}`
            : `/b2/exams/papers/${paperId}/congratulations`,
        );
      } catch (err) {
        if (
          err?.response?.status === 403 &&
          err?.response?.data?.alreadyCompleted
        ) {
          go(`/b2/exams/papers/${paperId}/congratulations`);
          return;
        }
        console.error("Error resolving next exam section:", err);
        setFailed(true);
      }
    })();
  }, [user?.user_id, paperId, navigate]);

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col">
      <div className="self-stretch px-4 py-2.5 flex items-center">
        <button
          onClick={() => navigate("/b2/test")}
          className="px-0.5 flex justify-center items-center gap-2 cursor-pointer bg-transparent border-0 outline-none"
        >
          <ChevronLeft className="w-4 h-4 text-slate-900" />
          <span className="text-center text-slate-900 text-sm font-semibold leading-6">
            Back
          </span>
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
        {failed ? (
          <>
            <AlertCircle className="w-8 h-8 text-red-500" />
            <p className="text-sm text-slate-600 text-center">
              Couldn't load your test. Please try again.
            </p>
          </>
        ) : (
          <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
        )}
      </div>
    </div>
  );
}
