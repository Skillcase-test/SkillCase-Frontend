import { Link, useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import mayaWave from "../../../assets/onboarding/mayaWave.webp";
import { images } from "../../../assets/images.js";
import { useUsageLimits } from "../../../hooks/useUsageLimits";
import { hapticLight } from "../../../utils/haptics";

const SKILLS = [
  {
    id: "b2-reading-card",
    moduleKey: "reading",
    label: "Reading",
    sub: "Texts, emails and grammar",
    image: images.b2Reading,
    link: "/b2/reading",
  },
  {
    id: "b2-listening-card",
    moduleKey: "listening",
    label: "Listening",
    sub: "Real exam audio",
    image: images.b2Listening,
    link: "/b2/listening",
  },
  {
    id: "b2-writing-card",
    moduleKey: "writing",
    label: "Writing",
    sub: "Emails and short texts",
    image: images.b2Writing,
    link: "/b2/writing",
  },
  {
    id: "b2-speaking-card",
    moduleKey: "speaking",
    label: "Speaking",
    sub: "Speak and get feedback",
    image: images.b2Speaking,
    link: "/b2/speaking",
  },
];

// B2 landing content ("Home for nurses" design): Your test card → hub,
// Practise next suggestion, the 2×2 skill grid and the full-exam navy card.
// Usage-limit locking is preserved from the old feature cards — a locked
// module opens the shared limit modal instead of navigating.
export default function B2PracticeHome({ overview }) {
  const navigate = useNavigate();
  const { getState } = useUsageLimits();

  const openModule = (moduleKey, link) => {
    const state = getState("B2", moduleKey);
    if (state?.locked) {
      window.dispatchEvent(
        new CustomEvent("skillcase:usage-limit", {
          detail: {
            locked: true,
            reason: "usage_limit",
            module_key: moduleKey,
            level: "B2",
            limit_value: state.limit_value,
            periods: state.periods,
            reset_at: state.reset_at,
            msg: state.hard_locked
              ? "This feature is currently locked."
              : "Your limit for this feature has been reached.",
          },
        }),
      );
      return;
    }
    hapticLight();
    navigate(link);
  };

  const completed = overview?.completed ?? 0;
  const total = overview?.total ?? 0;
  const nextPaper = overview?.nextPaper;
  const lastScore = overview?.latest?.overallScore;
  const suggested = overview?.suggested || null;

  const testTitle =
    lastScore != null
      ? `Last test: ${Math.round(lastScore)}%`
      : `Test ${completed + 1} of ${total || 10}`;
  const testSub = !nextPaper
    ? "All tests complete. See your progress."
    : nextPaper.inProgress
      ? "Continue where you left off."
      : completed === 0
        ? "Your first test is ready."
        : "Your next test is ready. See your progress.";

  return (
    <div className="bg-[#F5F7FA] rounded-t-[20px] p-4 flex flex-col gap-4 -mx-4">
      {/* Your test */}
      <Link
        to="/b2/test"
        id="b2-test-card"
        className="flex items-center gap-3 bg-white border border-[#C7DBF7] rounded-xl pl-2 pr-3 py-2.5 min-h-[88px]"
      >
        <img
          src={mayaWave}
          alt=""
          className="w-[72px] h-[72px] object-contain shrink-0 select-none pointer-events-none"
        />
        <span className="flex flex-col gap-[3px] flex-1 min-w-0">
          <span className="text-xs font-semibold text-[#717680] uppercase tracking-[0.06em]">
            Your test
          </span>
          <span className="font-semibold text-[17px] text-[#083262]">
            {testTitle}
          </span>
          <span className="text-[13px] leading-snug text-[#535862]">
            {testSub}
          </span>
        </span>
        <ChevronRight className="w-5 h-5 text-[#083262] shrink-0" />
      </Link>

      {/* Practise next — weakest skill's suggested exercise */}
      {suggested && (
        <button
          type="button"
          id="b2-practise-next"
          onClick={() =>
            openModule(
              suggested.module,
              `/b2/${suggested.module}/${suggested.exerciseId}`,
            )
          }
          className="w-full flex items-center gap-2.5 bg-white border border-[#E9EAEB] rounded-xl px-3 py-2.5 min-h-[52px] text-left cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-[#F04438] shrink-0" />
          <span className="flex flex-col flex-1 min-w-0">
            <span className="text-[13px] text-[#535862]">
              Practise next:{" "}
              <span className="font-semibold text-[#181D27]">
                {suggested.skillLabel}
              </span>
            </span>
            <span className="font-semibold text-sm text-[#181D27] truncate">
              {suggested.title}
            </span>
          </span>
          <span className="text-[13px] font-semibold text-[#083262] shrink-0">
            Start
          </span>
        </button>
      )}

      {/* Practise by skill */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col">
          <span className="font-semibold text-base text-[#181D27]">
            Practise by skill
          </span>
          <span className="text-[13px] text-[#717680]">
            Short practice from real exams
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {SKILLS.map((skill) => (
            <button
              key={skill.id}
              type="button"
              id={skill.id}
              onClick={() => openModule(skill.moduleKey, skill.link)}
              className="flex flex-col gap-1.5 bg-white border border-[#E9EAEB] rounded-xl p-1 text-left cursor-pointer hover:shadow-sm active:scale-[0.99] transition-all"
            >
              <div className="rounded-lg overflow-hidden h-16 md:h-40">
                <img
                  src={skill.image}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover select-none pointer-events-none"
                />
              </div>
              <span className="font-semibold text-[15px] text-[#181D27] px-1.5">
                {skill.label}
              </span>
              <span className="text-xs leading-snug text-[#535862] px-1.5 pb-1.5">
                {skill.sub}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Full exam practice (placeholder for now) */}
      <button
        type="button"
        id="b2-exams-card"
        onClick={() => openModule("exams", "/b2/exams")}
        className="w-full flex items-center gap-3 bg-[#083262] rounded-xl p-3.5 text-left cursor-pointer hover:bg-[#0b3d78] active:scale-[0.99] transition-all"
      >
        <span className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span className="font-semibold text-[15px] text-white">
            Full exam practice
          </span>
          <span className="text-xs leading-snug text-white/75">
            Real Goethe and telc exams, with a timer
          </span>
        </span>
        <span className="h-11 px-[18px] rounded-lg bg-[#EDB843] text-[#083262] font-semibold text-[15px] flex items-center shrink-0">
          Start
        </span>
      </button>
    </div>
  );
}
