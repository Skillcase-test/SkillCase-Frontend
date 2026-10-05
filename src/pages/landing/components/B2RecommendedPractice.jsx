import { useSelector } from "react-redux";
import { ArrowRight, Clock3 } from "lucide-react";
import useB2Access from "../../../hooks/useB2Access";
import useB2PracticeResume from "../../../hooks/useB2PracticeResume";
import { B2Button } from "../../../components/b2/B2UI";
import { skills } from "./B2PracticeHome";

/** The home page's recommended practice card, shown below the Medical German banner. */
export default function B2RecommendedPractice({ overview }) {
  const open = useB2Access();
  const userId = useSelector((state) => state.auth.user)?.user_id;
  const savedPractice = useB2PracticeResume(userId);
  const suggested = overview?.suggested;
  const practice = savedPractice || suggested;
  if (!practice) return null;
  const practiceSkillDetails = skills.find((skill) => skill.key === practice.module);
  const practiceSkill = practiceSkillDetails?.label;
  const description = savedPractice ? "Continue where you left off." : practiceSkillDetails?.description;
  const title =
    practice.title ||
    (String(practice.exerciseId) === String(suggested?.exerciseId) ? suggested?.title : `${practiceSkill} practice`);
  // .b2-home's unlayered margin would beat a Tailwind margin on it — wrap instead.
  return (
    <div className="mt-2.5">
      <section className="b2-home">
        <div className="b2-ui">
          <div className="b2-focus b2-home-recommendation" id="b2-practise-next">
            <div className="b2-home-recommendation-meta">
              <span className="b2-eyebrow">
                {savedPractice ? `Continue ${practiceSkill?.toLowerCase()}` : `Recommended ${practiceSkill?.toLowerCase()}`}
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
                <h2>{title}</h2>
                {description && <p>{description}</p>}
              </div>
              <B2Button
                className="b2-home-compact-action"
                aria-label={savedPractice ? "Resume practice" : "Start practice"}
                onClick={() => open(practice.module, `/b2/${practice.module}/${encodeURIComponent(practice.exerciseId)}`)}
              >
                {savedPractice ? "Resume" : "Start"}
                <ArrowRight size={14} aria-hidden="true" />
              </B2Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
