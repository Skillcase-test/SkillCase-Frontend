import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  startB2ExamSubmission,
  getB2ExamSubmissionStatus,
} from "../../../api/b2Api";
import { B2Page, B2State } from "../../../components/b2/B2UI";

// Fixed test sequence — sections are taken one by one, no picker screen.
const SECTION_ORDER = ["reading", "listening", "speaking", "writing"];

// Resolves the active submission and forwards to the first incomplete
// section, so every entry point (get-ready, test hub, results) resumes correctly.
export default function ExamSectionRedirect() {
  const navigate = useNavigate();
  const { paperId } = useParams();
  const { user } = useSelector((state) => state.auth);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
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
  }, [user?.user_id, paperId, navigate, attempt]);

  return (
    <B2Page title="Mock exam" back="/b2/test">
      {failed ? (
        <B2State
          title="Your test couldn’t load"
          description="Check your connection and try again."
          onRetry={() => {
            ran.current = false;
            setFailed(false);
            setAttempt((n) => n + 1);
          }}
        />
      ) : (
        <B2State loading />
      )}
    </B2Page>
  );
}
