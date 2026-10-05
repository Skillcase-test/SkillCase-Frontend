import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ChevronRight,
  Clock3,
  ClipboardList,
} from "lucide-react";
import { images } from "../../../assets/images";
import { getMayaImage } from "../../../utils/mayaAvatars";
import FeatureCard from "./FeatureCard";
import useB2Access from "../../../hooks/useB2Access";
import useB2PracticeResume from "../../../hooks/useB2PracticeResume";
import { getB2Exams } from "../../../api/b2Api";
import { B2Button, B2ScoreRing } from "../../../components/b2/B2UI";
import { normalizeB2Score } from "../../../utils/b2Scores";
const skills = [
  {
    key: "reading",
    label: "Reading",
    sub: "Texts & emails",
    description: "Read for key details.",
    image: images.b2Reading,
  },
  {
    key: "listening",
    label: "Listening",
    sub: "Conversations",
    description: "Listen for key details.",
    image: images.b2Listening,
  },
  {
    key: "speaking",
    label: "Speaking",
    sub: "Spoken German",
    description: "Speak with more confidence.",
    image: images.b2Speaking,
  },
  {
    key: "writing",
    label: "Writing",
    sub: "Written German",
    description: "Write clear, everyday German.",
    image: images.b2Writing,
  },
];
export default function B2PracticeHome({ overview, loading = false, onRetry }) {
  const open = useB2Access();
  const user = useSelector((state) => state.auth.user);
  const userId = user?.user_id;
  const savedPractice = useB2PracticeResume(userId);
  // Mock-exam papers go live the moment any active paper exists — the badge
  // stays "Coming soon" only while the catalogue is empty. null = still
  // loading, so it doesn't flash before the fetch resolves.
  const [hasExamPapers, setHasExamPapers] = useState(null);
  useEffect(() => {
    let cancelled = false;
    getB2Exams()
      .then((res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        if (!cancelled)
          setHasExamPapers(rows.some((e) => Number(e.total_papers) > 0));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const next = overview?.nextPaper,
    suggested = overview?.suggested,
    latest = overview?.latest;
  const resumeTest = !!next?.inProgress;
  const practice = savedPractice || suggested;
  const practiceSkillDetails = skills.find(
    (skill) => skill.key === practice?.module,
  );
  const practiceSkill = practiceSkillDetails?.label;
  const practiceDescription = savedPractice
    ? "Continue where you left off."
    : practiceSkillDetails?.description;
  const practiceTitle = practice?.title ||
    (String(practice?.exerciseId) === String(suggested?.exerciseId)
      ? suggested?.title
      : `${practiceSkill} practice`);
  const score = normalizeB2Score(latest?.overallScore);
  // Cards stay outside .b2-ui — its element rules would override the shared
  // card's Tailwind classes (unlayered beats layered utilities).
  return (
    <section className="b2-home">
      <div className="b2-ui b2-stack">
        <h1 className="sr-only">B2 practice</h1>
        {loading ? (
          <div
            className="b2-skeleton b2-skeleton--banner"
            role="status"
            aria-label="Loading"
          />
        ) : !overview ? (
          <div className="b2-note b2-note--warning">
            Progress couldn’t load. You can still practise below.
            {onRetry && (
              <B2Button variant="quiet" onClick={onRetry}>
                Reload progress
              </B2Button>
            )}
          </div>
        ) : next || latest ? (
          <div className="b2-home-test" id="b2-test-card">
            <Link
              className="b2-home-test-progress"
              to="/b2/test"
              aria-label={score !== null
                ? `Last test ${score}%, view assessment progress`
                : "View test progress"}
            >
              <div className="b2-home-test-score" data-chart={!!latest} aria-hidden="true">
                {latest ? <B2ScoreRing score={score} size={44} /> : <ClipboardList size={23} />}
              </div>
              <span className="b2-home-test-copy">
                <strong>
                  {latest ? "Your last test" : resumeTest ? "Test in progress" : "Your first test"}
                </strong>
                <span>
                  {latest || resumeTest ? (
                    <>View progress <ChevronRight size={13} aria-hidden="true" /></>
                  ) : (
                    <><Clock3 size={13} aria-hidden="true" /> About {next.durationMinutes || 15} min</>
                  )}
                </span>
              </span>
            </Link>
            {next && (
              <B2Button
                className="b2-home-compact-action"
                variant={practice ? "secondary" : "primary"}
                aria-label={resumeTest ? "Resume test" : latest ? "Take next test" : "Prepare for test"}
                onClick={() => open("exams", "/b2/test/ready")}
              >
                {resumeTest ? "Resume test" : latest ? "Next test" : "Prepare"}
              </B2Button>
            )}
          </div>
        ) : null}
        {practice && (
          <div
            className="b2-focus b2-home-recommendation"
            id="b2-practise-next"
          >
            <div className="b2-home-recommendation-meta">
              <span className="b2-eyebrow">
                {savedPractice
                  ? `Continue ${practiceSkill?.toLowerCase()}`
                  : `Recommended ${practiceSkill?.toLowerCase()}`}
              </span>
              {savedPractice ? (
                <span className="b2-home-duration">Saved on this device</span>
              ) : practice.durationMinutes > 0 && (
                <span className="b2-home-duration">
                  <Clock3 size={14} aria-hidden="true" />
                  {practice.durationMinutes} min
                </span>
              )}
            </div>
            <div className="b2-home-recommendation-main">
              <div className="b2-home-recommendation-copy">
                <h2>{practiceTitle}</h2>
                {practiceDescription && <p>{practiceDescription}</p>}
              </div>
              <B2Button
                className="b2-home-compact-action"
                aria-label={savedPractice ? "Resume practice" : "Start practice"}
                onClick={() =>
                  open(
                    practice.module,
                    `/b2/${practice.module}/${encodeURIComponent(practice.exerciseId)}`,
                  )
                }
              >
                {savedPractice ? "Resume" : "Start"}
                <ArrowRight size={14} aria-hidden="true" />
              </B2Button>
            </div>
          </div>
        )}
        <div className="b2-home-skills-heading">
          <h2>Practice</h2>
          {!next && !latest && (
            <Link
              className="b2-progress-link"
              to="/b2/test"
              aria-label="Test progress"
            >
              <span>Test progress</span>
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
      <div id="b2-skills" className="grid grid-cols-3 gap-2.5 -mt-2">
        {skills.map((s) => (
          <FeatureCard
            key={s.key}
            tourId={`b2-${s.key}-card`}
            title={s.label}
            description={s.sub}
            image={s.image}
            link={`/b2/${s.key}`}
            enabled
            moduleInfo={{ level: "B2", module_key: s.key }}
          />
        ))}
        {/* Talk to Maya — live voice practice; mode choice happens inside. */}
        <FeatureCard
          tourId="b2-maya-card"
          title="Talk to Maya"
          description="Everyday talk & interviews"
          image={getMayaImage("wave", user)}
          link="/b2/maya"
          enabled
          moduleInfo={{ level: "B2", module_key: "maya" }}
        />
        <FeatureCard
          tourId="b2-exams-card"
          title="Mock tests"
          description="Goethe & telc"
          image={images.mockTest}
          link="/b2/exams"
          enabled
          comingSoon={hasExamPapers === false}
          moduleInfo={{ level: "B2", module_key: "exams" }}
        />
      </div>
    </section>
  );
}
