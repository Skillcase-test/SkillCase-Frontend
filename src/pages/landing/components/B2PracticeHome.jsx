import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ArrowRight,
  ChevronRight,
  Clock3,
  ClipboardList,
} from "lucide-react";
import { images } from "../../../assets/images";
import { getMayaImage } from "../../../utils/mayaAvatars";
import useB2Access from "../../../hooks/useB2Access";
import useB2PracticeResume from "../../../hooks/useB2PracticeResume";
import { B2Button, B2ScoreRing, B2State } from "../../../components/b2/B2UI";
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
  return (
    <section className="b2-ui b2-home">
      <h1 className="sr-only">B2 practice</h1>
      {loading ? (
        <B2State loading />
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
      <section className="b2-stack b2-home-skills" id="b2-skills">
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
        <div className="b2-skill-grid">
          {skills.map((s) => (
            <button
              key={s.key}
              id={`b2-${s.key}-card`}
              className="b2-skill-card"
              onClick={() => open(s.key, `/b2/${s.key}`)}
            >
              <span className="b2-skill-card-media"><img src={s.image} alt="" /></span>
              <div>
                <strong>{s.label}</strong>
                <p>{s.sub}</p>
              </div>
            </button>
          ))}
          <Link
            id="b2-exams-card"
            className="b2-skill-card b2-mock-card"
            to="/b2/exams"
            aria-label="Mock tests, Goethe and telc, coming soon"
          >
            <span className="b2-skill-card-media">
              <img src={images.mockTest} alt="" />
              <span className="b2-card-availability">Coming soon</span>
            </span>
            <div>
              <strong>Mock tests</strong>
              <p>Goethe &amp; telc</p>
            </div>
          </Link>
          {/* Talk to Maya — live voice practice; mode choice happens inside. */}
          <button
            type="button"
            id="b2-maya-card"
            className="b2-skill-card"
            onClick={() => open("maya", "/b2/maya")}
            aria-label="Talk to Maya, live German speaking practice"
          >
            <span className="b2-skill-card-media b2-skill-card-media-maya">
              <img src={getMayaImage("wave", user)} alt="" />
            </span>
            <div>
              <strong>Talk to Maya</strong>
              <p>Everyday talk &amp; interviews</p>
            </div>
          </button>
        </div>
      </section>
    </section>
  );
}
