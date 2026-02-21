import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import Badge from "../../../components/ui/Badge";
import ExamCards from "../../exam/ExamCards";
import { images } from "../../../assets/images.js";
import { useState } from "react";
import { hapticLight } from "../../../utils/haptics";

/* Feature Cards */

export default function FeatureCardsGrid() {
  const { user } = useSelector((state) => state.auth);
  const profLevel = user?.user_prof_level || "A1";

  const isA2 = profLevel.toLowerCase() === "a2";

  const a1Features = [
    {
      id: "flashcards",
      title: "Flashcards",
      description: "Practice basic German using Flashcards",
      image: images.flashcards,
      link: `/practice/${profLevel}`,
      enabled: true,
    },
    {
      id: "vocabulary",
      title: "Vocabulary Practice",
      description: "Build your German vocabulary",
      image: images.vocabulary,
      link: `/pronounce/${profLevel}`,
      enabled: true,
    },
    {
      id: "mock-test",
      title: "Mock Test",
      description: "Test your German knowledge",
      image: images.mockTest,
      link: `/test/${profLevel}`,
      enabled: true,
    },
    {
      id: "listener",
      title: "Listener",
      description: "Listen the conversations",
      image: images.speakToAI,
      link: `/conversation/${profLevel}`,
      enabled: true,
    },
    {
      id: "stories",
      title: "Short Stories",
      description: "Read engaging stories",
      image: images.grammar,
      link: `/stories`,
      enabled: true,
    },
    {
      id: "interview",
      title: "Interview Practice",
      description: "Prepare for job interviews",
      image: images.interview,
      link: `#`,
      enabled: false,
      comingSoon: true,
    },
  ];

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

  const features = isA2 ? a2Features : a1Features;

  const getTourId = (id) => {
    const tourIds = {
      flashcards: "flashcard-card",
      vocabulary: "pronunciation-card",
      "mock-test": "test-card",
      listener: "listener-card",
      stories: "stories-card",
      "a2-flashcards": "a2-flashcard-card",
      "a2-grammar": "a2-grammar-card",
      "a2-listening": "a2-listening-card",
      "a2-speaking": "a2-speaking-card",
      "a2-reading": "a2-reading-card",
      "a2-test": "a2-test-card",
    };
    return tourIds[id] || undefined;
  };

  return (
    <div
      id={isA2 ? "a2-feature-cards-grid" : "feature-cards-grid"}
      className="px-4 pt-8 pb-4"
    >
      <div id="feature-cards-grid" className="grid grid-cols-3 gap-2.5">
        {features.map((feature) => (
          <FeatureCard
            key={feature.id}
            {...feature}
            tourId={getTourId(feature.id)}
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
}) {
  const CardWrapper = enabled ? Link : "div";
  const [isPressed, setIsPressed] = useState(false);

  return (
    <CardWrapper
      id={tourId}
      to={enabled ? link : undefined}
      onTouchStart={() => {
        if (enabled) {
          setIsPressed(true);
          hapticLight();
        }
      }}
      onTouchEnd={() => setIsPressed(false)}
      onMouseDown={() => enabled && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      className={`
        bg-white rounded-lg p-0.5 card-shadow
        transition-all duration-150
        ${
          enabled
            ? "hover:scale-105 cursor-pointer"
            : "opacity-60 cursor-not-allowed"
        }
        ${isPressed ? "scale-[0.85] shadow-inner" : ""}
        ${!enabled && "bg-[#e5e5e5]"}
      `}
    >
      {/* Image */}
      <div className="h-16 md:h-40 rounded-md overflow-hidden">
        <img src={image} alt={title} className="w-full h-full object-cover" />
      </div>

      {/* Content */}
      <div className="p-1.5 pb-2">
        <h3 className="text-xs md:text-xl font-medium text-black mb-1">
          {title}
        </h3>
        {comingSoon ? (
          <Badge variant="warning">Coming soon</Badge>
        ) : (
          <p className="text-[8px] md:text-[14px] text-black opacity-60 leading-[1.3]">
            {description}
          </p>
        )}
      </div>
    </CardWrapper>
  );
}
