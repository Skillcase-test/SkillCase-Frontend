import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ClipboardList, Clock3 } from "lucide-react";
import { B2Page, B2Button, B2State } from "../../../components/b2/B2UI";
import { getB2Exams, getB2ExamPapers } from "../../../api/b2Api";

// Full mock exams (Goethe/telc papers). Shows "coming soon" until at least
// one active paper exists; once any paper is uploaded the picker goes live.
export default function PaperSelect() {
  const navigate = useNavigate();
  const [exams, setExams] = useState(null); // [{exam…, papers:[]}]
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getB2Exams();
        const rows = Array.isArray(res?.data) ? res.data : [];
        const withPapers = rows.filter((e) => Number(e.total_papers) > 0);
        const paperLists = await Promise.all(
          withPapers.map((e) =>
            getB2ExamPapers(e.exam_type)
              .then((r) => ({ papers: Array.isArray(r?.data) ? r.data : [], failed: false }))
              .catch(() => ({ papers: [], failed: true })),
          ),
        );
        if (cancelled) return;
        setExams(
          withPapers.map((e, i) => ({
            ...e,
            papers: paperLists[i].papers,
            papersFailed: paperLists[i].failed,
          })),
        );
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasPapers = (exams || []).some((e) => Number(e.total_papers) > 0);

  return (
    <B2Page title="Full mock exams">
      {exams === null && !failed ? (
        <B2State loading />
      ) : failed ? (
        <div className="b2-content" id="b2-exams-error">
          <span className="b2-icon">
            <ClipboardList size={24} />
          </span>
          <span className="b2-eyebrow">Something went wrong</span>
          <h1>Mock exams couldn’t load</h1>
          <p>Check your connection and try again.</p>
          <B2Button onClick={() => window.location.reload()}>Retry</B2Button>
        </div>
      ) : !hasPapers ? (
        <div className="b2-content" id="b2-exams-coming-soon">
          <span className="b2-icon">
            <ClipboardList size={24} />
          </span>
          <span className="b2-eyebrow">Coming soon</span>
          <h1>Goethe & telc mock exams</h1>
          <p>For now, practise a skill or take an assessment.</p>
          <B2Button onClick={() => navigate("/")}>Practise a skill</B2Button>
          <B2Button variant="secondary" onClick={() => navigate("/b2/test")}>
            View assessments
          </B2Button>
        </div>
      ) : (
        <div className="b2-content" id="b2-exams-list">
          <span className="b2-eyebrow">Mock exams</span>
          <h1>Goethe & telc mock exams</h1>
          <p>Full-length exam papers — pick one to begin.</p>
          {exams.map((exam) => (
            <section key={exam.id} className="mt-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-2">
                {exam.title || String(exam.exam_type).toUpperCase()}
                <span className="ml-2 font-medium normal-case text-gray-400">
                  {exam.completed_papers > 0
                    ? `${exam.completed_papers}/${exam.total_papers} completed`
                    : `${exam.total_papers} paper${Number(exam.total_papers) === 1 ? "" : "s"}`}
                </span>
              </h2>
              <div className="space-y-2">
                {exam.papersFailed && (
                  <p className="text-xs text-gray-400 px-1">
                    Papers couldn't load — pull to refresh or reopen this page.
                  </p>
                )}
                {exam.papers.map((paper) => (
                  <button
                    key={paper.id}
                    type="button"
                    onClick={() =>
                      navigate(`/b2/exams/papers/${paper.id}/dashboard`)
                    }
                    className="w-full text-left bg-white border border-gray-200 rounded-2xl px-4 py-3 flex items-center gap-3 hover:border-[#002856]/40 transition-colors"
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block text-[15px] font-semibold text-[#002856] truncate">
                        {paper.title}
                      </span>
                      <span className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                        {paper.duration_minutes ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock3 size={12} />
                            {paper.duration_minutes} min
                          </span>
                        ) : null}
                        {paper.difficulty_tag ? (
                          <span>{paper.difficulty_tag}</span>
                        ) : null}
                      </span>
                    </span>
                    {paper.submission_status === "in_progress" ? (
                      <span className="text-xs font-bold text-[#ac8121] bg-[#fff4e0] px-2 py-1 rounded-full">
                        Resume
                      </span>
                    ) : paper.submission_status === "completed" ? (
                      <span className="text-xs font-bold text-[#019035] bg-[#e9f9ee] px-2 py-1 rounded-full">
                        Review
                      </span>
                    ) : null}
                    <ChevronRight size={16} className="text-gray-400" />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </B2Page>
  );
}
