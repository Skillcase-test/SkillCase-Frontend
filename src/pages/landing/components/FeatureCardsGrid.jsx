import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import Badge from "../../../components/ui/Badge";
import ExamCards from "../../exam/ExamCards";
import { images } from "../../../assets/images.js";
import { useState } from "react";
import FeatureStatusChip from "../../../components/ui/FeatureStatusChip";
import { hapticLight } from "../../../utils/haptics";
import {
  isB1PracticeLevel,
  isB2PracticeLevel,
} from "../../../utils/b1Progress";
import { useUsageLimits } from "../../../hooks/useUsageLimits";
import { useFeatureFlags } from "../../../hooks/useFeatureFlags";

/* Feature Cards */

// Maps a feature card's id to the (level, module_key) the backend gates it
// under (see SkillCase-backend/util/usageLimits.js MODULE_REGISTRY).
const MODULE_MAP = {
  "a1-revamp-flashcard": { level: "A1", module_key: "flashcard" },
  "a1-revamp-grammar": { level: "A1", module_key: "grammar" },
  "a1-revamp-listening": { level: "A1", module_key: "listening" },
  "a1-revamp-speaking": { level: "A1", module_key: "speaking" },
  "a1-revamp-reading": { level: "A1", module_key: "reading" },
  "a1-revamp-test": { level: "A1", module_key: "test" },
  "a2-flashcards": { level: "A2", module_key: "flashcard" },
  "a2-grammar": { level: "A2", module_key: "grammar" },
  "a2-listening": { level: "A2", module_key: "listening" },
  "a2-speaking": { level: "A2", module_key: "speaking" },
  "a2-reading": { level: "A2", module_key: "reading" },
  "a2-test": { level: "A2", module_key: "test" },
  "b1-flashcard": { level: "B1", module_key: "flashcard" },
  "b1-read-listen": { level: "B1", module_key: "reading" },
  "b1-describe-speak": { level: "B1", module_key: "describe_speak" },
  "b1-exams": { level: "B1", module_key: "exams" },
  "b1-maya": { level: "B1", module_key: "maya" },
  "b2-reading": { level: "B2", module_key: "reading" },
  "b2-listening": { level: "B2", module_key: "listening" },
  "b2-writing": { level: "B2", module_key: "writing" },
  "b2-speaking": { level: "B2", module_key: "speaking" },
  "b2-exams": { level: "B2", module_key: "exams" },
};

const studyNotesFeature = {
  id: "study-notes",
  title: "Study Notes",
  description: "Read PDF study notes and materials",
  image: images.grammar,
  link: "/notes",
  enabled: true,
};

export default function FeatureCardsGrid() {
  const { user } = useSelector((state) => state.auth);
  const { isFeatureEnabled } = useFeatureFlags();
  const profLevel = user?.user_prof_level || "A1";

  const normalizedProfLevel = profLevel.toLowerCase();
  const isB1 = isB1PracticeLevel(normalizedProfLevel);
  const isB2 = isB2PracticeLevel(normalizedProfLevel);
  const isA2 = normalizedProfLevel === "a2";

  // A2 features
  const a2Features = [
    {
      id: "a2-flashcards",
      title: "Flashcards",
      description: "Advanced vocabulary with sentences",
      image: images.flashcards,
      link: "/a2/flashcard",
      enabled: true,
    },
    {
      id: "a2-grammar",
      title: "Grammar",
      description: "Master German grammar rules",
      image: images.grammar || images.flashcards,
      link: "/a2/grammar",
      enabled: true,
    },
    {
      id: "a2-listening",
      title: "Listening",
      description: "Improve your comprehension",
      image: images.speakToAI,
      link: "/a2/listening",
      enabled: true,
    },
    {
      id: "a2-speaking",
      title: "Speaking",
      description: "Practice pronunciation",
      image: images.interview,
      link: "/a2/speaking",
      enabled: true,
    },
    {
      id: "a2-reading",
      title: "Reading",
      description: "Read and understand German texts",
      image: images.vocabulary,
      link: "/a2/reading",
      enabled: true,
    },
    {
      id: "a2-test",
      title: "Test",
      description: "Test your A2 knowledge",
      image: images.mockTest,
      link: "/a2/test",
      enabled: true,
    },
  ];

  const a1RevampFeatures = [
    {
      id: "a1-revamp-flashcard",
      title: "Flashcards",
      description: "Learn image-based vocabulary with quiz checkpoints",
      image: images.flashcards,
      link: "/a1/flashcard",
      enabled: true,
    },
    {
      id: "a1-revamp-grammar",
      title: "Grammar",
      description: "Learn chapter-wise grammar in A1",
      image: images.grammar || images.flashcards,
      link: "/a1/grammar",
      enabled: true,
    },
    {
      id: "a1-revamp-listening",
      title: "Listening",
      description: "Train your ear with guided beginner audio tasks",
      image: images.speakToAI,
      link: "/a1/listening",
      enabled: true,
    },
    {
      id: "a1-revamp-speaking",
      title: "Speaking",
      description: "Practice pronunciation with guided speaking cards",
      image: images.interview,
      link: "/a1/speaking",
      enabled: true,
    },
    {
      id: "a1-revamp-reading",
      title: "Reading",
      description: "Practice reading comprehension in A1",
      image: images.vocabulary,
      link: "/a1/reading",
      enabled: true,
    },
    {
      id: "a1-revamp-test",
      title: "Test",
      description: "Take level-wise A1 tests",
      image: images.mockTest,
      link: "/a1/test",
      enabled: true,
    },
  ];

  const b1Features = [
    {
      id: "b1-flashcard",
      title: "Flashcards",
      description: "Practice basic German using Flashcards",
      image: images.flashcards,
      link: "/b1/flashcard",
      enabled: true,
    },
    {
      id: "b1-read-listen",
      title: "Reading & Listening",
      description: "Read articles and answer questions",
      image:
        "https://res.cloudinary.com/dzwdjjg5d/image/upload/v1781090498/read_listen_pwnige.webp",
      link: "/b1/read-listen",
      enabled: true,
    },
    {
      id: "b1-describe-speak",
      title: "Describe & Speak",
      description: "Describe images and practice pronunciation",
      image:
        "https://res.cloudinary.com/dzwdjjg5d/image/upload/v1781090503/describe_speak_dtdpvf.webp",
      link: "/b1/describe-speak",
      enabled: true,
    },
    {
      id: "b1-exams",
      title: "TELC & GOETHE Exam Papers",
      description: "Take mock exams under real constraints",
      image:
        "https://res.cloudinary.com/dzwdjjg5d/image/upload/v1781090510/exam_isoiv2.webp",
      link: "/b1/exams",
      enabled: true,
    },
    {
      id: "b1-maya",
      title: "Talk to Maya",
      description: "Have real German conversation & get instant feedback",
      image:
        "https://res.cloudinary.com/dzwdjjg5d/image/upload/v1781600945/maya_ylcppy.webp",
      link: "/b1/maya",
      enabled: true,
    },
  ];

  // B2 suite — five features: 4 practice modules (tag-filtered exercise
  // lists) + full TELC/Goethe exam papers. Card visuals are B1-styled
  // placeholders until the dedicated B2 card design lands.
  const b2Features = [
    {
      id: "b2-reading",
      title: "Reading",
      description: "B2 reading comprehension practice",
      image:
        "https://res.cloudinary.com/dzwdjjg5d/image/upload/v1781090498/read_listen_pwnige.webp",
      link: "/b2/reading",
      enabled: true,
    },
    {
      id: "b2-listening",
      title: "Listening",
      description: "B2 audio comprehension practice",
      image:
        "https://res.cloudinary.com/dzwdjjg5d/image/upload/v1781090498/read_listen_pwnige.webp",
      link: "/b2/listening",
      enabled: true,
    },
    {
      id: "b2-writing",
      title: "Writing",
      description: "Exam-style essays with AI feedback",
      image:
        "https://res.cloudinary.com/dzwdjjg5d/image/upload/v1781090503/describe_speak_dtdpvf.webp",
      link: "/b2/writing",
      enabled: true,
    },
    {
      id: "b2-speaking",
      title: "Speaking",
      description: "B2 speaking prompts with AI scoring",
      image:
        "https://res.cloudinary.com/dzwdjjg5d/image/upload/v1781090503/describe_speak_dtdpvf.webp",
      link: "/b2/speaking",
      enabled: true,
    },
    {
      id: "b2-exams",
      title: "Exam Papers",
      description: "Full TELC & Goethe mock exams",
      image:
        "https://res.cloudinary.com/dzwdjjg5d/image/upload/v1781090510/exam_isoiv2.webp",
      link: "/b2/exams",
      enabled: true,
    },
  ];

  const features = [
    ...(isB2
      ? b2Features
      : isB1
        ? b1Features
        : isA2
          ? a2Features
          : a1RevampFeatures),
    ...(isFeatureEnabled("study_notes") ? [studyNotesFeature] : []),
  ];

  const getTourId = (id) => {
    const tourIds = {
      "a2-flashcards": "a2-flashcard-card",
      "a2-grammar": "a2-grammar-card",
      "a2-listening": "a2-listening-card",
      "a2-speaking": "a2-speaking-card",
      "a2-reading": "a2-reading-card",
      "a2-test": "a2-test-card",
      "a1-revamp-flashcard": "a1-revamp-flashcard-card",
      "a1-revamp-grammar": "a1-revamp-grammar-card",
      "a1-revamp-listening": "a1-revamp-listening-card",
      "a1-revamp-speaking": "a1-revamp-speaking-card",
      "a1-revamp-reading": "a1-revamp-reading-card",
      "a1-revamp-test": "a1-revamp-test-card",
      "b1-flashcard": "b1-flashcard-card",
      "b1-read-listen": "b1-read-listen-card",
      "b1-describe-speak": "b1-describe-speak-card",
      "b1-exams": "b1-exams-card",
      "b1-maya": "b1-maya-card",
      "b2-reading": "b2-reading-card",
      "b2-listening": "b2-listening-card",
      "b2-writing": "b2-writing-card",
      "b2-speaking": "b2-speaking-card",
      "b2-exams": "b2-exams-card",
    };
    return tourIds[id] || undefined;
  };

  return (
    <div
      id={
        isB2
          ? "b2-feature-cards-grid"
          : isB1
            ? "b1-feature-cards-grid"
            : isA2
              ? "a2-feature-cards-grid"
              : "feature-cards-grid"
      }
      className="px-4 pt-2 pb-4"
    >
      <div id="feature-cards-grid" className="grid grid-cols-3 gap-2.5">
        {features.map((feature) => (
          <FeatureCard
            key={feature.id}
            {...feature}
            tourId={getTourId(feature.id)}
            moduleInfo={MODULE_MAP[feature.id]}
          />
        ))}
        <ExamCards />
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  image,
  link,
  enabled,
  comingSoon,
  tourId,
  moduleInfo,
}) {
  const { eligible, getState } = useUsageLimits();
  const moduleState = moduleInfo
    ? getState(moduleInfo.level, moduleInfo.module_key)
    : null;
  const isLocked = Boolean(moduleState?.locked);

  const clickable = enabled && !isLocked;
  const CardWrapper = clickable ? Link : "div";
  const [isPressed, setIsPressed] = useState(false);

  const openLockModal = () => {
    if (!isLocked || !moduleState) return;
    window.dispatchEvent(
      new CustomEvent("skillcase:usage-limit", {
        detail: {
          locked: true,
          reason: "usage_limit",
          module_key: moduleInfo.module_key,
          level: moduleInfo.level,
          limit_value: moduleState.limit_value,
          periods: moduleState.periods,
          reset_at: moduleState.reset_at,
          msg: moduleState.hard_locked
            ? "This feature is currently locked."
            : "Your limit for this feature has been reached.",
        },
      }),
    );
  };

  return (
    <CardWrapper
      id={tourId}
      to={clickable ? link : undefined}
      onClick={isLocked ? openLockModal : undefined}
      onTouchStart={() => {
        if (clickable) {
          setIsPressed(true);
          hapticLight();
        }
      }}
      onTouchEnd={() => setIsPressed(false)}
      onMouseDown={() => clickable && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      className={`
        relative bg-white rounded-lg p-0.5 card-shadow flex flex-col
        transition-all duration-150
        ${
          clickable
            ? "hover:scale-105 cursor-pointer"
            : isLocked
              ? "cursor-pointer"
              : "opacity-60 cursor-not-allowed"
        }
        ${isPressed ? "scale-[0.85] shadow-inner" : ""}
        ${!enabled && "bg-[#e5e5e5]"}
      `}
    >
      {/* Image */}
      <div className="h-16 md:h-40 rounded-md overflow-hidden">
        <img
          src={image}
          alt={title}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="p-1.5 pb-1.5 flex-1 flex flex-col justify-start items-start">
        <h3 className="text-[10px] md:text-xl font-medium text-black mb-1">
          {title}
        </h3>
        {comingSoon ? (
          <Badge variant="warning">Coming soon</Badge>
        ) : (
          <>
            <p className="text-[8px] md:text-[14px] text-black opacity-60 leading-[1.3]">
              {description}
            </p>
            {/* Usage-state chip — pinned to the bottom-left of every card so
                it stays consistent regardless of description length. */}
            {eligible && (
              <div className="mt-auto pt-1 self-stretch">
                <FeatureStatusChip state={moduleState} />
              </div>
            )}
          </>
        )}
      </div>
    </CardWrapper>
  );
}
