import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { ChevronLeft, Loader2, AlertCircle, Check } from "lucide-react";
import { FiBookOpen } from "react-icons/fi";
import { PiPencilSimpleLine, PiHeadphonesLight } from "react-icons/pi";
import { CiMicrophoneOn } from "react-icons/ci";
import {
  startB1ExamSubmission,
  getB1ExamSubmissionStatus,
} from "../../../api/b1Api";

export default function ExamBlockSelector() {
  const navigate = useNavigate();
  const { paperId } = useParams();
  const { user } = useSelector((state) => state.auth);

  const [submission, setSubmission] = useState(null);
  const [sectionsStatus, setSectionsStatus] = useState({});
  const [selectedSection, setSelectedSection] = useState("reading");
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      // 1. Get submission session
      const startRes = await startB1ExamSubmission(paperId);
      const subId = startRes.data.id;

      // 2. Fetch section-by-section progress status
      // Use statusRes.data.submission (includes exam_type via JOIN) instead of startRes.data
      const statusRes = await getB1ExamSubmissionStatus(subId);
      setSubmission(statusRes.data.submission);
      const sectionsList = Array.isArray(statusRes.data.sections)
        ? statusRes.data.sections
        : [];

      const statusMap = {};
      sectionsList.forEach((sec) => {
        statusMap[sec.section_type] = sec;
      });
      setSectionsStatus(statusMap);
    } catch (err) {
      // F-H1: If the paper is already completed the backend returns 403 with alreadyCompleted flag
      // Redirect straight to Congratulations — don't show an error screen
      if (
        err?.response?.status === 403 &&
        err?.response?.data?.alreadyCompleted
      ) {
        navigate(`/b1/exams/papers/${paperId}/congratulations`, {
          replace: true,
        });
        return;
      }
      console.error("Error fetching submission details:", err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.user_id || !paperId) return;
    fetchStatus();
  }, [user?.user_id, paperId]);

  const handleStartExam = () => {
    if (!submission) return;

    // Check if overall completed -> congratulations page
    const allCompleted = ["reading", "writing", "listening", "speaking"].every(
      (type) => sectionsStatus[type]?.status === "completed",
    );
    if (allCompleted) {
      navigate(`/b1/exams/papers/${paperId}/congratulations`);
      return;
    }

    const currentStatus = sectionsStatus[selectedSection]?.status;
    if (currentStatus === "completed") {
      // Navigate directly to the results/review screen
      navigate(`/b1/exams/papers/${paperId}/${selectedSection}/results`, {
        state: { submissionId: submission.id },
      });
    } else {
      // Navigate to the section workspace
      navigate(`/b1/exams/papers/${paperId}/${selectedSection}`);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-md lg:max-w-none mx-auto min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
      </div>
    );
  }

  const allCompleted = ["reading", "writing", "listening", "speaking"].every(
    (type) => sectionsStatus[type]?.status === "completed",
  );

  const getSectionTitle = (type) => {
    switch (type) {
      case "reading":
        return "Reading";
      case "writing":
        return "Writing";
      case "listening":
        return "Listening";
      case "speaking":
        return "Speaking";
      default:
        return "";
    }
  };

  const activeStatus = sectionsStatus[selectedSection]?.status;

  const totalMins =
    ["reading", "writing", "listening", "speaking"].reduce(
      (acc, type) => acc + (sectionsStatus[type]?.duration_minutes || 0),
      0,
    ) || 120;

  const sectionsData = [
    {
      type: "reading",
      title: "Reading",
      icon: <FiBookOpen className="w-6 h-6 text-blue-600" />,
    },
    {
      type: "writing",
      title: "Writing",
      icon: <PiPencilSimpleLine className="w-6 h-6 text-blue-600" />,
    },
    {
      type: "listening",
      title: "Listening",
      icon: <PiHeadphonesLight className="w-6 h-6 text-blue-600" />,
    },
    {
      type: "speaking",
      title: "Speaking",
      icon: <CiMicrophoneOn className="w-6 h-6 text-blue-600" />,
    },
  ];

  return (
    <div className="w-full max-w-md lg:max-w-none mx-auto min-h-screen bg-white flex flex-col justify-between items-center overflow-hidden relative pb-8">
      {/* Navigation bar */}
      <div className="self-stretch px-4 py-2.5 flex flex-col justify-start items-start gap-2.5 shrink-0 bg-white">
        <div className="self-stretch inline-flex justify-between items-center">
          <button
            onClick={() =>
              // exam_type now always present via statusRes.data.submission JOIN
              navigate(`/b1/exams/${submission?.exam_type || ""}/papers`)
            }
            className="px-0.5 flex justify-center items-center gap-2 cursor-pointer bg-transparent border-0 outline-none"
          >
            <ChevronLeft className="w-4 h-4 text-slate-900" />
            <span className="text-center text-slate-900 text-sm font-semibold leading-6">
              Back
            </span>
          </button>
          <span className="text-center text-neutral-500 text-sm font-semibold leading-6">
            {submission?.exam_type?.toUpperCase() || ""}
          </span>
        </div>
      </div>

      {fetchError ? (
        <div className="flex-1 w-full flex flex-col items-center justify-center gap-3 bg-white">
          <AlertCircle className="w-6 h-6 text-red-500" />
          <p className="text-slate-500 text-xs font-semibold">
            Failed to load exam dashboard.
          </p>
          <button
            onClick={fetchStatus}
            className="text-[#002856] text-xs font-semibold underline underline-offset-2 bg-transparent border-0 cursor-pointer"
          >
            Tap to retry
          </button>
        </div>
      ) : (
        <>
          {/* Header Description */}
          <div className="self-stretch px-5 pt-3 flex flex-col justify-start items-start gap-1 shrink-0 bg-white pb-6 lg:px-8">
            <h2 className="text-left text-sky-950 text-xl font-bold font-['Inter'] leading-7">
              Choose a section to start
            </h2>
            <p className="text-left text-slate-500 text-xs font-normal leading-4 mt-1">
              Total time: <span className="font-bold">{totalMins} mins</span>
            </p>
          </div>

          {/* Grid Blocks Container */}
          <div className="flex-1 w-full px-5 py-6 flex flex-col justify-start items-center gap-6 bg-white lg:px-8">
            <div className="w-full grid grid-cols-2 lg:grid-cols-4 gap-4">
              {sectionsData.map((sec) => {
                const type = sec.type;
                const status = sectionsStatus[type]?.status || "not_started";
                const isCompleted = status === "completed";
                const isSelected = selectedSection === type;
                const duration = sectionsStatus[type]?.duration_minutes || 30;
                const totalQuestions =
                  sectionsStatus[type]?.total_questions || 0;

                return (
                  <div
                    key={type}
                    onClick={() => setSelectedSection(type)}
                    className={`p-4 rounded-xl border flex flex-col justify-center items-center gap-3 cursor-pointer select-none transition-all relative ${
                      isCompleted
                        ? "bg-[#f5f5f5] border-zinc-200"
                        : isSelected
                        ? "bg-white border-blue-900 shadow-sm"
                        : "bg-white border-zinc-200 hover:border-zinc-300"
                    }`}
                    style={{ height: "190px" }}
                  >
                    {/* Top right checkmark badge if completed */}
                    {isCompleted && (
                      <div className="absolute top-3 right-3 w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white stroke-[3]" />
                      </div>
                    )}

                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                      {sec.icon}
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-slate-900 text-sm font-semibold">
                        {sec.title}
                      </span>
                      <span className="text-slate-400 text-xs">
                        {totalQuestions} blocks
                      </span>
                    </div>
                    <div className="bg-[#E9E9E9] text-sky-950 rounded-full px-4 py-1.5 text-xs font-semibold">
                      {duration} mins
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sticky Bottom Actions */}
          <div className="w-full px-4 pb-10 lg:pb-14 shrink-0 mt-auto">
            <button
              onClick={handleStartExam}
              className="w-full py-3 bg-[#0a1f44] hover:bg-[#06142c] active:scale-[0.99] text-white text-base font-semibold rounded-lg shadow-md transition-all outline-none border-0 cursor-pointer flex justify-center items-center"
            >
              {allCompleted
                ? "View Overall Congratulations"
                : activeStatus === "completed"
                ? `Review ${getSectionTitle(selectedSection)} Answers`
                : `Start ${getSectionTitle(selectedSection)} Exam`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
